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

function competitiveStats(mysqli $db, int $userId): array {
    $db->query("INSERT INTO player_competitive_stats (userId,elo,wins,losses) VALUES ($userId,100,0,0) ON DUPLICATE KEY UPDATE userId=VALUES(userId)");
    $row = $db->query("SELECT elo,wins,losses FROM player_competitive_stats WHERE userId=$userId")->fetch_assoc();
    return ['elo'=>(int)$row['elo'], 'wins'=>(int)$row['wins'], 'losses'=>(int)$row['losses']];
}

function competitiveActiveMatch(mysqli $db, int $userId): ?array {
    $row = $db->query("SELECT m.matchId,m.status,IF(m.player1Id=$userId,a2.pilotName,a1.pilotName) opponentName
        FROM player_competitive_matches m
        JOIN player_accounts a1 ON a1.userId=m.player1Id
        JOIN player_accounts a2 ON a2.userId=m.player2Id
        WHERE (m.player1Id=$userId OR m.player2Id=$userId) AND m.status IN ('starting','active')
        ORDER BY m.matchId DESC LIMIT 1")->fetch_assoc();
    return $row ? ['matchId'=>(int)$row['matchId'], 'status'=>(string)$row['status'], 'opponentName'=>(string)$row['opponentName']] : null;
}

function competitiveTryMatch(mysqli $db, int $userId): ?array {
    $lock = $db->query("SELECT GET_LOCK('darkorbit_competitive_matchmaking',2) acquired")->fetch_assoc();
    if ((int)$lock['acquired'] !== 1) return null;
    $pair = null;
    try {
        $db->query("DELETE FROM player_competitive_queue WHERE heartbeatAt<DATE_SUB(NOW(),INTERVAL 20 SECOND)");
        $active = competitiveActiveMatch($db, $userId);
        if ($active) return $active;

        $mine = $db->query("SELECT s.elo,TIMESTAMPDIFF(SECOND,q.joinedAt,NOW()) waited
            FROM player_competitive_queue q JOIN player_competitive_stats s ON s.userId=q.userId
            WHERE q.userId=$userId")->fetch_assoc();
        if (!$mine) return null;
        if (Socket::Get('HasAvailableDuelArena', ['Return'=>false]) !== true) return null;
        $myElo = (int)$mine['elo'];
        $myRange = min(1000, 100 + intdiv(max(0, (int)$mine['waited']), 10) * 50);

        $candidates = $db->query("SELECT q.userId,s.elo,TIMESTAMPDIFF(SECOND,q.joinedAt,NOW()) waited
            FROM player_competitive_queue q JOIN player_competitive_stats s ON s.userId=q.userId
            WHERE q.userId<>$userId ORDER BY ABS(s.elo-$myElo),q.joinedAt LIMIT 20");
        while ($candidate = $candidates->fetch_assoc()) {
            $candidateId = (int)$candidate['userId'];
            $candidateRange = min(1000, 100 + intdiv(max(0, (int)$candidate['waited']), 10) * 50);
            if (abs((int)$candidate['elo'] - $myElo) > max($myRange, $candidateRange)) continue;
            $available = Socket::Get('CanStartDuel', ['InviterId'=>$userId, 'InviteeId'=>$candidateId, 'Return'=>false]);
            if ($available !== true) {
                $db->query("DELETE FROM player_competitive_queue WHERE userId=$candidateId");
                continue;
            }
            $insert = $db->prepare("INSERT INTO player_competitive_matches (player1Id,player2Id,status) VALUES (?,?,'starting')");
            $insert->bind_param('ii', $userId, $candidateId);
            $insert->execute();
            $matchId = (int)$db->insert_id;
            $db->query("DELETE FROM player_competitive_queue WHERE userId IN ($userId,$candidateId)");
            $pair = ['matchId'=>$matchId, 'player1Id'=>$userId, 'player2Id'=>$candidateId];
            break;
        }
    } finally {
        $db->query("SELECT RELEASE_LOCK('darkorbit_competitive_matchmaking')");
    }

    if (!$pair) return null;
    $started = Socket::Get('StartCompetitiveDuel', [
        'Player1Id'=>$pair['player1Id'], 'Player2Id'=>$pair['player2Id'],
        'MatchId'=>$pair['matchId'], 'Return'=>false
    ]);
    $status = $started === true ? 'active' : 'failed';
    $matchId = (int)$pair['matchId'];
    $db->query("UPDATE player_competitive_matches SET status='$status',startedAt=".($started === true ? 'NOW()' : 'NULL')." WHERE matchId=$matchId AND status='starting'");
    if ($started !== true) return null;
    return competitiveActiveMatch($db, $userId);
}

if ($action === 'competitive_leaderboard') {
    $leaders = [];
    $result = $db->query("SELECT a.pilotName,s.elo,s.wins,s.losses FROM player_competitive_stats s
        JOIN player_accounts a ON a.userId=s.userId ORDER BY s.elo DESC,s.wins DESC,s.losses ASC,s.updatedAt ASC,s.userId ASC LIMIT 20");
    $rank = 1;
    $titles = [1=>'Best Player',2=>'2nd Best Player',3=>'3rd Best Player'];
    $colors = [1=>'gold',2=>'silver',3=>'bronze'];
    while ($row = $result->fetch_assoc()) {
        $leaders[] = ['rank'=>$rank, 'pilotName'=>(string)$row['pilotName'], 'elo'=>(int)$row['elo'],
            'wins'=>(int)$row['wins'], 'losses'=>(int)$row['losses'],
            'title'=>$titles[$rank] ?? '', 'titleColor'=>$colors[$rank] ?? ''];
        $rank++;
    }
    arenaResponse(true, '', ['leaderboard'=>$leaders]);
}

if ($action === 'competitive_search') {
    if (Socket::Get('CanQueueCompetitive', ['UserId'=>$userId, 'Return'=>false]) !== true)
        arenaResponse(false, 'Musíš byť online a nesmieš už bojovať.');
    competitiveStats($db, $userId);
    $db->query("INSERT INTO player_competitive_queue (userId,joinedAt,heartbeatAt) VALUES ($userId,NOW(),NOW())
        ON DUPLICATE KEY UPDATE heartbeatAt=NOW()");
    $match = competitiveTryMatch($db, $userId);
    arenaResponse(true, $match ? 'Súper nájdený. Presun do arény…' : 'Hľadám súpera…',
        ['state'=>$match ? 'matched' : 'searching', 'match'=>$match, 'stats'=>competitiveStats($db, $userId)]);
}

if ($action === 'competitive_poll') {
    $match = competitiveActiveMatch($db, $userId);
    $queued = $db->query("SELECT userId FROM player_competitive_queue WHERE userId=$userId")->num_rows === 1;
    if ($queued && !$match) {
        $db->query("UPDATE player_competitive_queue SET heartbeatAt=NOW() WHERE userId=$userId");
        $match = competitiveTryMatch($db, $userId);
    }
    arenaResponse(true, '', ['state'=>$match ? 'matched' : ($queued ? 'searching' : 'idle'),
        'match'=>$match, 'stats'=>competitiveStats($db, $userId)]);
}

if ($action === 'competitive_cancel') {
    $delete = $db->prepare('DELETE FROM player_competitive_queue WHERE userId=?');
    $delete->bind_param('i', $userId);
    $delete->execute();
    arenaResponse(true, 'Hľadanie bolo zrušené.', ['state'=>'idle']);
}

if ($action === 'leaderboard') {
    $leaders = [];
    $result = $db->query("SELECT a.pilotName, s.wins, s.losses FROM player_duel_stats s JOIN player_accounts a ON a.userId=s.userId ORDER BY s.wins DESC, s.losses ASC, a.pilotName ASC LIMIT 10");
    while ($row = $result->fetch_assoc()) {
        $leaders[] = ['pilotName'=>(string)$row['pilotName'], 'wins'=>(int)$row['wins'], 'losses'=>(int)$row['losses']];
    }
    arenaResponse(true, '', ['leaderboard'=>$leaders]);
}

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
