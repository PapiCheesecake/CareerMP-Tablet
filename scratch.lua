local lvl = core_levels.getLevelByName("west_coast_usa")
if lvl.minimap then
  dump(lvl.minimap)
elseif lvl.minimapImage then
  print(lvl.minimapImage)
end
