<?php $orbitCurrentShip = $mysqli->query('SELECT * FROM server_ships WHERE shipID = '.(int)$player['shipId'])->fetch_assoc(); ?>
<main id="main"><div class="container"><div class="row">
<?php require_once(INCLUDES . 'data.php'); ?>
<div class="col s12">
<section class="orbit-hero"><div class="orbit-hero-copy"><span class="orbit-eyebrow">THE GALAXY IS CALLING</span><h2>A new horizon.<br><em>Your next adventure.</em></h2><p>Power up your ship, reunite with your allies and make your next move. The universe is yours to explore.</p><div class="orbit-hero-actions"><a class="orbit-button" href="/map-revolution" target="_blank" rel="noopener">Launch game <span>&nearr;</span></a><a class="orbit-button orbit-button-quiet" href="/ships">Explore your fleet</a></div></div><span class="orbit-hero-coordinate">DEEP SPACE / UNLIMITED POSSIBILITIES</span></section>
<div class="orbit-dashboard-bottom">
<section class="orbit-feature-card has-ship"><span class="orbit-eyebrow">YOUR ACTIVE SHIP</span><h3><?php echo orbit_escape($orbitCurrentShip['name']); ?></h3><p>A trusted companion for uncharted space. Get your ship mission-ready.</p><a href="/equipment">Open equipment <span>&nearr;</span></a><img class="orbit-small-ship" src="<?php echo orbit_ship_art($orbitCurrentShip['lootID'], $player['factionId']); ?>" alt="<?php echo orbit_escape($orbitCurrentShip['name']); ?>"></section>
<section class="orbit-feature-card"><span class="orbit-eyebrow">THE FULL EXPERIENCE</span><h3>Your cockpit. Anywhere.</h3><p>Download the Windows client, unpack the ZIP and open Start-Client.cmd to play.</p><a href="/downloads/DarkOrbit-Client.zip?v=<?php echo (int)@filemtime(dirname(__DIR__, 2).'/downloads/DarkOrbit-Client.zip'); ?>" download>Download Windows client <span>&nearr;</span></a></section>
</div>
<section class="orbit-feature-card" style="margin-bottom:24px"><div class="orbit-profile-summary"><img src="/img/avatar.png" alt="Pilot portrait"><div><span class="orbit-eyebrow">PILOT DOSSIER</span><h3><?php echo orbit_escape($player['pilotName']); ?></h3></div></div><div class="orbit-profile-meta"><div>Rank<strong><?php echo orbit_escape(Functions::GetRankName($player['rankId'])); ?></strong></div><div>Level<strong><?php echo Functions::GetLevel($data->experience); ?></strong></div><div>Clan<strong><?php echo isset($clan) ? orbit_escape($clan['name']) : 'Free agent'; ?></strong></div><div>Pilot ID<strong><?php echo (int)$player['userId']; ?></strong></div></div></section>
</div>
            <div class="col s12">
              <div class="card white-text grey darken-4 center">
                <div class="padding-15">
                  <h5 >Hall of fame</h5>
                  <ul class="tabs grey darken-3 tabs-fixed-width tab-demo z-depth-1">
                    <li class="tab"><a href="#pilots">PILOTS</a></li>
                    <li class="tab"><a href="#clans">CLANS</a></li>
                    <li class="tab"><a href="#warRanks">WAR RANKS</a></li>
                  </ul>
                  <div id="pilots">
                    <table class="striped highlight">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Company</th>
                          <th>Rank</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php foreach ($mysqli->query('SELECT * FROM player_accounts WHERE rankId != 21 AND rank > 0 ORDER BY rank ASC LIMIT 9') as $value) { ?>
                        <tr>
                          <td><?php echo orbit_escape($value['pilotName']); ?></td>
                          <td><img src="/img/companies/logo_<?php echo($value['factionId'] == 1 ? 'mmo' : ($value['factionId'] == 2 ? 'eic' : 'vru')); ?>_mini.png"></td>
                          <td><?php echo $value['rank']; ?></td>
                          <td><?php echo $value['rankPoints']; ?></td>
                        </tr>
                      <?php } ?>
                      <?php if ($player['rank'] > 9) { ?>
                      <tr>
                        <td><?php echo orbit_escape($player['pilotName']); ?></td>
                        <td><img src="/img/companies/logo_<?php echo($player['factionId'] == 1 ? 'mmo' : ($player['factionId'] == 2 ? 'eic' : 'vru')); ?>_mini.png"></td>
                        <td><?php echo $player['rank']; ?></td>
                        <td><?php echo $player['rankPoints']; ?></td>
                      </tr>
                      <?php } ?>
                      </tbody>
                    </table>
                  </div>
                  <div id="clans">
                    <table class="striped highlight">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Rank</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php foreach ($mysqli->query('SELECT * FROM server_clans WHERE rank > 0 ORDER BY rank ASC LIMIT 9') as $value) { ?>
                        <tr>
                          <td><a href="<?php echo DOMAIN; ?>clan/clan-details/<?php echo $value['id']?>">[<?php echo $value['tag']; ?>] <?php echo $value['name']; ?></a></td>
                          <td><?php echo $value['rank']; ?></td>
                          <td><?php echo $value['rankPoints']; ?></td>
                        </tr>
                        <?php } ?>
                        <?php if (isset($clan) && $clan['rank'] > 9) { ?>
                          <tr>
                            <td>[<?php echo $clan['tag']; ?>] <?php echo $clan['name']; ?></td>
                            <td><?php echo $clan['rank']; ?></td>
                            <td><?php echo $clan['rankPoints']; ?></td>
                          </tr>
                        <?php } ?>
                      </tbody>
                    </table>
                  </div>
                  <div id="warRanks">
                    <table class="striped highlight">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Company</th>
                          <th>Rank</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php foreach ($mysqli->query('SELECT * FROM player_accounts WHERE rankId != 21 AND warRank > 0 ORDER BY warRank ASC LIMIT 9') as $value) { ?>
                        <tr>
                          <td><?php echo orbit_escape($value['pilotName']); ?></td>
                          <td><img src="/img/companies/logo_<?php echo($value['factionId'] == 1 ? 'mmo' : ($value['factionId'] == 2 ? 'eic' : 'vru')); ?>_mini.png"></td>
                          <td><?php echo $value['warRank']; ?></td>
                          <td><?php echo $value['warPoints']; ?></td>
                        </tr>
                      <?php } ?>
                      <?php if ($player['rank'] > 9) { ?>
                      <tr>
                        <td><?php echo orbit_escape($player['pilotName']); ?></td>
                        <td><img src="/img/companies/logo_<?php echo($player['factionId'] == 1 ? 'mmo' : ($player['factionId'] == 2 ? 'eic' : 'vru')); ?>_mini.png"></td>
                        <td><?php echo $player['warRank']; ?></td>
                        <td><?php echo $player['warPoints']; ?></td>
                      </tr>
                      <?php } ?>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
