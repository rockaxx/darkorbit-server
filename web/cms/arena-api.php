<?php
require_once __DIR__.'/files/config.php';
header('Content-Type: application/json; charset=utf-8');

function arenaResponse(bool $status, string $message, array $extra = []): void {
    echo json_encode(array_merge(['status'=>$status, 'message'=>$message], $extra));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !Functions::IsLoggedIn()) {
    http_response_code(401);
    arenaResponse(false, 'Musíš byť prihlásený.');
}

$db = Database::GetInstance();
$player = Functions::GetPlayer();
$userId = (int)$player['userId'];
$action = (string)($_POST['action'] ?? '');
$db->query("UPDATE player_duel_invites SET status='expired' WHERE status='pending' AND expiresAt<=NOW()");

if ($action === 'invite') {
    $nickname = trim((string)($_POST['nickname'] ?? ''));
    if ($nickname === '' || mb_strlen($nickname) > 32) arenaResponse(false, 'Zadaj platný nick.');

    $find = $db->prepare('SELECT userId, pilotName FROM player_accounts WHERE LOWER(pilotName)=LOWER(?) LIMIT 1');
    $find->bind_param('s', $nickname);
    $find->execute();
    $target = $find->get_result()->fetch_assoc();
    if (!$target) arenaResponse(false, 'Hráč s týmto nickom neexistuje.');
    $targetId = (int)$target['userId'];
    if ($targetId === $userId) arenaResponse(false, 'Nemôžeš pozvať sám seba.');

    $available = Socket::Get('CanStartDuel', ['InviterId'=>$userId, 'InviteeId'=>$targetId, 'Return'=>false]);
    if ($available !== true) arenaResponse(false, 'Hráč je offline, zničený alebo už bojuje.');

    $busy = $db->prepare("SELECT COUNT(*) amount FROM player_duel_invites WHERE status='pending' AND expiresAt>NOW() AND (inviterId IN (?,?) OR inviteeId IN (?,?))");
    $busy->bind_param('iiii', $userId, $targetId, $userId, $targetId);
    $busy->execute();
    if ((int)$busy->get_result()->fetch_assoc()['amount'] > 0) arenaResponse(false, 'Jeden z hráčov už má čakajúcu pozvánku.');

    $insert = $db->prepare("INSERT INTO player_duel_invites (inviterId, inviteeId, status, expiresAt) VALUES (?,?,'pending',DATE_ADD(NOW(), INTERVAL 60 SECOND))");
    $insert->bind_param('ii', $userId, $targetId);
    $insert->execute();
    arenaResponse(true, 'Pozvánka odoslaná hráčovi '.$target['pilotName'].'.', ['inviteId'=>(int)$db->insert_id]);
}

if ($action === 'poll') {
    $poll = $db->prepare("SELECT i.inviteId, a.pilotName inviterName, TIMESTAMPDIFF(SECOND,NOW(),i.expiresAt) secondsLeft FROM player_duel_invites i JOIN player_accounts a ON a.userId=i.inviterId WHERE i.inviteeId=? AND i.status='pending' AND i.expiresAt>NOW() ORDER BY i.inviteId DESC LIMIT 1");
    $poll->bind_param('i', $userId);
    $poll->execute();
    $invite = $poll->get_result()->fetch_assoc();
    if ($invite) {
        $invite['inviteId'] = (int)$invite['inviteId'];
        $invite['secondsLeft'] = max(0, (int)$invite['secondsLeft']);
    }
    arenaResponse(true, '', ['invite'=>$invite ?: null]);
}

if ($action === 'accept') {
    $inviteId = (int)($_POST['inviteId'] ?? 0);
    $db->begin_transaction();
    try {
        $select = $db->prepare("SELECT inviterId, inviteeId FROM player_duel_invites WHERE inviteId=? AND inviteeId=? AND status='pending' AND expiresAt>NOW() FOR UPDATE");
        $select->bind_param('ii', $inviteId, $userId);
        $select->execute();
        $invite = $select->get_result()->fetch_assoc();
        if (!$invite) {
            $db->rollback();
            arenaResponse(false, 'Pozvánka už neplatí.');
        }
        $accepted = $db->prepare("UPDATE player_duel_invites SET status='accepted', respondedAt=NOW() WHERE inviteId=? AND status='pending'");
        $accepted->bind_param('i', $inviteId);
        $accepted->execute();
        $db->commit();
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }

    $started = Socket::Get('StartDuel', ['InviterId'=>(int)$invite['inviterId'], 'InviteeId'=>$userId, 'Return'=>false]);
    if ($started !== true) {
        $failed = $db->prepare("UPDATE player_duel_invites SET status='failed' WHERE inviteId=?");
        $failed->bind_param('i', $inviteId);
        $failed->execute();
        arenaResponse(false, 'Aréna sa nedala spustiť; hráč už nie je dostupný.');
    }
    arenaResponse(true, 'Prijaté. Presun do 1v1 arény…');
}

if ($action === 'decline') {
    $inviteId = (int)($_POST['inviteId'] ?? 0);
    $decline = $db->prepare("UPDATE player_duel_invites SET status='declined', respondedAt=NOW() WHERE inviteId=? AND inviteeId=? AND status='pending'");
    $decline->bind_param('ii', $inviteId, $userId);
    $decline->execute();
    if ($decline->affected_rows !== 1) arenaResponse(false, 'Pozvánka už neplatí.');
    arenaResponse(true, 'Pozvánka odmietnutá.');
}

arenaResponse(false, 'Neznáma arena akcia.');
