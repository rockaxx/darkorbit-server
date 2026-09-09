<?php
$equipment = $mysqli->query('SELECT * FROM player_equipment WHERE userId = '.(int)$player['userId'])->fetch_assoc();
$ownedShips = array_unique(array_merge(json_decode($equipment['items'])->ships, [8,10]));
$currentShip = $mysqli->query('SELECT * FROM server_ships WHERE shipID = '.(int)$player['shipId'])->fetch_assoc();
$fleet = [];
foreach ($ownedShips as $shipId) {
    $ship = $mysqli->query('SELECT * FROM server_ships WHERE shipID = '.(int)$shipId)->fetch_assoc();
    if ($ship) $fleet[] = $ship;
}
?>
<main id="main"><div class="container">
  <section class="orbit-fleet-feature">
    <div class="orbit-fleet-feature-copy"><span class="orbit-eyebrow"><span class="orbit-status-dot"></span> ACTIVE SPACESHIP</span><h2><?php echo orbit_escape($currentShip['name']); ?></h2><p>Your ship. Your signature.<br>Prepare your loadout and take your place among the stars.</p><a class="orbit-button orbit-button-quiet" href="/equipment">Configure ship <span>↗</span></a></div>
    <div class="orbit-ship-stage"><div class="orbit-radar"></div><img src="<?php echo orbit_ship_art($currentShip['lootID'], $player['factionId']); ?>" alt="<?php echo orbit_escape($currentShip['name']); ?>"><span class="orbit-stage-label">HANGAR // READY FOR DEPLOYMENT</span></div>
  </section>
  <div class="orbit-section-heading"><div><span class="orbit-eyebrow">FLEET COLLECTION</span><h2>Choose your next mission.</h2></div><span class="orbit-count"><?php echo count($fleet); ?> ships available</span></div>
  <div class="ships orbit-fleet-grid">
  <?php foreach ($fleet as $ship) {
      $active = (int)$currentShip['baseShipId'] === (int)$ship['shipID'];
      $displayShip = $active ? $currentShip : $ship;
      $roles = ['ship_aegis'=>'SUPPORT', 'ship_citadel'=>'HEAVY ASSAULT', 'ship_spearhead'=>'RECON', 'ship_vengeance'=>'INTERCEPTOR', 'ship_goliath'=>'BATTLECRUISER'];
  ?>
    <button type="button" id="<?php echo orbit_escape($ship['lootID']); ?>" class="ship<?php echo $active ? ' active' : ''; ?>" aria-label="<?php echo ($active ? 'Active ship: ' : 'Select ship: ').orbit_escape($ship['name']); ?>" aria-pressed="<?php echo $active ? 'true' : 'false'; ?>">
      <span class="orbit-ship-status"><?php echo $active ? '● ACTIVE' : 'OWNED'; ?></span><span class="orbit-ship-art"><img loading="lazy" src="<?php echo orbit_ship_art($displayShip['lootID'], $player['factionId']); ?>" alt="<?php echo orbit_escape($displayShip['name']); ?>"></span><span class="orbit-ship-role"><?php echo $roles[$ship['lootID']] ?? 'STARSHIP'; ?></span><strong><?php echo orbit_escape($ship['name']); ?></strong><span class="orbit-ship-select"><?php echo $active ? 'Currently equipped' : 'Select spaceship'; ?><span><?php echo $active ? '✓' : '↗'; ?></span></span>
    </button>
  <?php } ?>
  </div>
</div></main>
