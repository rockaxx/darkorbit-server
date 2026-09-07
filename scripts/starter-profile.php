<?php
function starterProfile(mysqli $db): array {
    $ships = [];
    $designs = [];
    foreach ($db->query('SELECT shipID, baseShipId FROM server_ships WHERE baseShipId > 0') as $ship) {
        $id = (int)$ship['shipID'];
        $base = (int)$ship['baseShipId'];
        if ($id === $base) {
            // The original CMS always adds Vengeance and Goliath itself.
            if (!in_array($id, [8,10])) { $ships[] = $id; }
        } else { $designs[$base][] = $id; }
    }
    $droneConfig = function(int $designStart) {
        return array_map(function($i) use ($designStart) {
            return ['items'=>[155+$i*2,156+$i*2], 'designs'=>[$designStart+$i]];
        }, range(0,9));
    };
    return [
        'player_accounts'=>[
            'version'=>0, 'premium'=>1, 'factionId'=>1, 'shipId'=>10,
            'data'=>['uridium'=>1000000000,'credits'=>1000000000,'honor'=>1000000,'experience'=>1000000000,'jackpot'=>0],
            'bootyKeys'=>['greenKeys'=>100000,'redKeys'=>100000,'blueKeys'=>100000],
            'extraEnergy'=>100000, 'nanohull'=>256000
        ],
        'player_equipment'=>[
            'config1_lasers'=>range(140,154), 'config2_lasers'=>range(140,154),
            'config1_generators'=>array_merge(range(40,49),range(100,104)),
            'config2_generators'=>range(100,114),
            'config1_drones'=>$droneConfig(120), 'config2_drones'=>$droneConfig(130),
            'items'=>['lf4Count'=>50,'havocCount'=>10,'herculesCount'=>10,'apis'=>true,'zeus'=>true,'pet'=>true,
                'petModules'=>[], 'ships'=>$ships,'designs'=>(object)$designs,
                'skillTree'=>['logdisks'=>100000,'researchPoints'=>0,'resetCount'=>0]],
            'skill_points'=>['engineering'=>5,'shieldEngineering'=>5,'detonation1'=>2,'detonation2'=>3,
                'heatseekingMissiles'=>5,'rocketFusion'=>5,'cruelty1'=>2,'cruelty2'=>3,'explosives'=>5,'luck1'=>2,'luck2'=>3]
        ],
        'player_settings'=>[
            'inGameSettings'=>['petDestroyed'=>false,'blockedGroupInvites'=>false,
                'selectedLaser'=>'ammunition_laser_ucb-100','selectedRocket'=>'ammunition_rocket_plt-3030',
                'selectedRocketLauncher'=>'ammunition_rocketlauncher_hstrm-01','selectedFormation'=>'drone_formation_default',
                'currentConfig'=>1,'selectedCpus'=>['equipment_extra_cpu_arol-x','equipment_extra_cpu_rllb-x']],
            'slotbarItems'=>(object)[1=>'ammunition_laser_ucb-100',2=>'ammunition_laser_rsb-75',3=>'ammunition_laser_sab-50',
                4=>'ammunition_rocket_plt-3030',5=>'ammunition_specialammo_emp-01',6=>'equipment_extra_cpu_ish-01',
                7=>'ammunition_mine_smb-01',8=>'drone_formation_f-09-mo',9=>'drone_formation_f-07-di',10=>'drone_formation_default']
        ]
    ];
}
