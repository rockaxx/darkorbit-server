<?php
require_once __DIR__.'/ui.php';
$orbitLoggedIn = Functions::IsLoggedIn();
$orbitPage = $page[0] ?? 'index';
$orbitTitles = ['home'=>'Command center', 'ships'=>'Your fleet', 'equipment'=>'Equipment', 'skill_tree'=>'Pilot skills', 'shop'=>'Supply station', 'clan'=>'Clan headquarters', 'settings'=>'Pilot settings', 'company_select'=>'Choose your allegiance'];
$orbitDescriptions = ['home'=>'Your next chapter starts beyond the stars.', 'ships'=>'Choose your ship. Make the galaxy yours.', 'equipment'=>'Fine-tune your ship for the mission ahead.', 'skill_tree'=>'Build the pilot you were meant to be.', 'shop'=>'Everything you need for your next mission.', 'clan'=>'Stronger together. Unstoppable in orbit.', 'settings'=>'Your identity. Your preferences.', 'company_select'=>'Three corporations. One galaxy. Your choice.'];
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090e15">
  <title><?php echo orbit_escape($orbitTitles[$orbitPage] ?? 'Enter the orbit'); ?> · DarkOrbit</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link rel="stylesheet" href="/css/materialize.min.css">
  <link rel="stylesheet" href="/css/style.css">
  <?php if ($orbitPage === 'company_select' || ($orbitPage === 'clan' && ($page[1] ?? '') === 'company')) { ?><link rel="stylesheet" href="/css/company-select.css"><?php } ?>
  <?php if ($orbitPage === 'skill_tree') { ?><link rel="stylesheet" href="/css/skill-tree.css"><?php } ?>
  <?php if ($orbitPage === 'ships') { ?><link rel="stylesheet" href="/css/ships.css"><?php } ?>
  <link rel="stylesheet" href="/css/orbit.css?v=<?php echo (int)filemtime(dirname(__DIR__, 3).'/css/orbit.css'); ?>">
  <script defer src="/js/orbit.js?v=<?php echo (int)filemtime(dirname(__DIR__, 3).'/js/orbit.js'); ?>"></script>
</head>
<body class="orbit-ui <?php echo $orbitLoggedIn ? 'orbit-member' : 'orbit-guest'; ?>" data-page="<?php echo orbit_escape($orbitPage); ?>">
<div id="app">
<?php if ($orbitLoggedIn) { ?>
  <aside class="orbit-sidebar" id="orbit-sidebar" aria-label="Main navigation">
    <a class="orbit-brand" href="/"><span class="orbit-brandmark"><?php echo orbit_icon('ships'); ?></span><span>DARK<span class="orbit-wordmark">ORBIT</span><small>BEYOND THE LIMITS</small></span></a>
    <div class="orbit-nav-caption">COMMAND</div>
    <div class="orbit-nav-links">
    <?php foreach (['home'=>['/','Overview'], 'ships'=>['/ships','Hangar'], 'equipment'=>['/equipment','Equipment'], 'skill_tree'=>['/skill-tree','Pilot skills'], 'shop'=>['/shop','Shop'], 'clan'=>[$player['clanId'] > 0 ? '/clan/informations' : '/clan/join','Clan']] as $key=>$link) { ?>
      <a href="<?php echo $link[0]; ?>" <?php echo $orbitPage === $key ? 'class="is-active" aria-current="page"' : ''; ?>><?php echo orbit_icon($key); ?><span><?php echo $link[1]; ?></span><?php if ($orbitPage === $key) { ?><span class="orbit-nav-dot"></span><?php } ?></a>
    <?php } ?>
    </div>
    <div class="orbit-sidebar-bottom">
      <div class="orbit-sector"><span class="orbit-eyebrow">YOUR CORPORATION</span><strong><?php echo [1=>'Mars Mining Operations',2=>'Earth Industries Corporation',3=>'Venus Resources Unlimited'][(int)$player['factionId']] ?? 'Unaffiliated'; ?></strong><span>Deep space. Shared ambition.</span></div>
      <a class="orbit-utility" href="/settings"><?php echo orbit_icon('settings'); ?> Settings</a>
      <a class="orbit-utility" href="/api/logout"><?php echo orbit_icon('logout'); ?> Log out</a>
    </div>
  </aside>
  <button class="orbit-backdrop" aria-label="Close navigation" hidden></button>
  <header class="orbit-topbar">
    <button class="orbit-menu" aria-controls="orbit-sidebar" aria-expanded="false" aria-label="Open navigation">☰</button>
    <div class="orbit-breadcrumb">COMMAND <span>/</span> <strong><?php echo orbit_escape($orbitTitles[$orbitPage] ?? 'Explorer'); ?></strong></div>
    <div class="orbit-pilot"><span class="orbit-pilot-avatar"><?php echo orbit_escape(strtoupper(substr($player['pilotName'], 0, 1))); ?></span><div><strong><?php echo orbit_escape($player['pilotName']); ?></strong><small>Level <?php echo Functions::GetLevel($data->experience); ?> pilot</small></div></div>
  </header>
  <section class="orbit-page-heading"><div><span class="orbit-eyebrow">DARKORBIT / <?php echo $orbitPage === 'home' ? 'PILOT OVERVIEW' : 'FLIGHT COMMAND'; ?></span><h1><?php echo orbit_escape($orbitTitles[$orbitPage] ?? 'Explore'); ?></h1><p><?php echo orbit_escape($orbitDescriptions[$orbitPage] ?? 'Your journey continues.'); ?></p></div><a class="orbit-button orbit-launch" href="/map-revolution" target="_blank" rel="noopener"><?php echo orbit_icon('ships'); ?> Launch game <span>↗</span></a></section>
  <?php if ($orbitPage === 'clan') { ?><div class="orbit-subnav"><?php $orbitClanLinks = $player['clanId'] > 0 ? ['informations'=>'Overview','members'=>'Members','diplomacy'=>'Diplomacy','company'=>'Corporation'] : ['join'=>'Find a clan','found'=>'Create a clan','company'=>'Corporation']; foreach ($orbitClanLinks as $key=>$label) { ?><a href="/clan/<?php echo $key; ?>" class="<?php echo ($page[1] ?? '') === $key ? 'is-active' : ''; ?>"><?php echo $label; ?></a><?php } ?></div><?php } ?>
<?php } else { ?>
  <header class="orbit-landing-nav"><a class="orbit-brand" href="/"><span class="orbit-brandmark"><?php echo orbit_icon('ships'); ?></span><span>DARK<span class="orbit-wordmark">ORBIT</span><small>BEYOND THE LIMITS</small></span></a><span class="orbit-landing-tag">A GALAXY WITHOUT LIMITS</span><a class="orbit-button orbit-button-quiet" href="#login">Pilot access <span>↗</span></a></header>
<?php } ?>
