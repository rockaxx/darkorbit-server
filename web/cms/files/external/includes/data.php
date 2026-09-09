<div class="col s12"><div id="data" class="orbit-resources">
<?php foreach (['uridium'=>['Uridium','◆'], 'credits'=>['Credits','◈'], 'honor'=>['Honor','✧'], 'experience'=>['Experience','⌁']] as $key=>$resource) { ?>
  <div class="orbit-resource"><span class="orbit-resource-icon"><?php echo $resource[1]; ?></span><div><span class="orbit-resource-label"><?php echo $resource[0]; ?></span><strong id="<?php echo $key; ?>"><?php echo number_format($data->$key, 0, '.', ' '); ?></strong></div></div>
<?php } ?>
</div></div>
