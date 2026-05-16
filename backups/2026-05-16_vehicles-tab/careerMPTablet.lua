-- CareerMP Tablet — Lua Extension
-- Handles toggle visibility, settings persistence, and future game data hooks

local M = {}
M.dependencies = {}

local isVisible = false -- ADD TO SERVER SIDED CONGIG FILE TODO
local refreshTimer = 0
local refreshInterval = 5 -- ADD TO SERVER SIDED CONGIG FILE TODO
local intenseRefreshTimer = 0
local intenseRefreshInterval = 15 -- ADD TO SERVER SIDED CONGIG FILE TODO
local settingsPath = 'settings/CareerMPTablet/settings.json'  -- ADD TO SERVER SIDED CONGIG FILE TODO

-- Default settings
local defaultSettings = {
  left = '50px',
  top = '50px',
  width = '960px',
  height = '620px',
  useMiles = false,
  notifications = true,
  notificationPosition = 'bottom-right'
}

local function onExtensionLoaded()
  log('I', 'careerMPTablet', 'CareerMP Tablet extension loaded')
  -- Push saved settings to the UI once it's ready
  -- (the UI will request settings on load via requestSettings)
end

-- Refreshes all tablet data at once (add future Phase 2 hooks here)
local function refreshTablet()
  if M.pushDataToUI then M.pushDataToUI() end
  if M.getRecoveryData then M.getRecoveryData() end
  if M.getProfileData then M.getProfileData() end
end

-- Refreshes all resource intensive tablet data at once (add future Phase 2 hooks here)
local function refreshTabletIntense()
  if M.getMapData then M.getMapData() end
  -- e.g., M.getJobsData()
end

-- Auto refresh after set time (default 5 seconds)
local function onUpdate(dt)
  if not isVisible then return end

  -- Fast refresh
  refreshTimer = refreshTimer + dt

  if refreshTimer >= refreshInterval then
    refreshTimer = 0
    refreshTablet()
  end

  -- Slow map refresh
  intenseRefreshTimer = intenseRefreshTimer + dt

  if intenseRefreshTimer >= intenseRefreshInterval then
    intenseRefreshTimer = 0
    refreshTabletIntense()
  end
end

-- Toggle the tablet app visibility via custom UI event
local function toggleTablet()
  isVisible = not isVisible
  if isVisible then
    refreshTimer = 0
    intenseRefreshTimer = 0
    refreshTablet()
    refreshTabletIntense()
  end
  guihooks.trigger('careerMPTabletToggle', isVisible)
  log('D', 'careerMPTablet', 'Tablet visibility: ' .. tostring(isVisible))
end

-- Show the tablet
local function showTablet()
  isVisible = true
  refreshTimer = 0
  intenseRefreshTimer = 0
  refreshTablet()
  refreshTabletIntense()
  guihooks.trigger('careerMPTabletToggle', true)
end

-- Hide the tablet
local function hideTablet()
  -- need to figure out how to get the menu to close when pressing escape. or entering a menu.
  isVisible = false
  guihooks.trigger('careerMPTabletToggle', false)
end

-- Save settings to a JSON file
local function saveSettings(settingsJson)
  local s = settingsJson
  if type(s) == 'string' then
    s = jsonDecode(settingsJson)
  end
  if not s then
    log('E', 'careerMPTablet', 'Failed to decode settings JSON')
    return
  end

  -- Merge with defaults to ensure all keys exist
  for k, v in pairs(defaultSettings) do
    if s[k] == nil then
      s[k] = v
    end
  end

  -- Ensure the settings directory exists
  local dir = 'settings/CareerMPTablet'
  if FS and FS.directoryCreate then
    FS:directoryCreate(dir)
  end

  local ok, err = pcall(function()
    jsonWriteFile(settingsPath, s, true)
  end)
  if ok then
    log('I', 'careerMPTablet', 'Settings saved to ' .. settingsPath)
  else
    log('E', 'careerMPTablet', 'Failed to save settings: ' .. tostring(err))
  end
end

-- Load settings and push to UI
local function requestSettings()
  local settings = jsonReadFile(settingsPath)
  if not settings then
    log('I', 'careerMPTablet', 'No saved settings found, using defaults')
    settings = defaultSettings
  end
  guihooks.trigger('careerMPTabletSettings', settings)
  log('D', 'careerMPTablet', 'Settings pushed to UI')
end

-- ===== Recovery System =====
-- We delegate all actual recovery actions to core_recoveryPrompt.buttonPressed()
-- so that prices, payments, fade, sounds etc. always come from the game's own code.
-- The display prices below are estimates for the UI only — the actual charge is
-- handled entirely by the game's recovery system, so if prices update, the
-- player always pays the correct amount.

-- Price constants matching recoveryPrompt.lua exactly
local flipUpRightCost = 50
local towToRoadCost = 75
local baseTowToGarageCost = 250

-- Gather all recovery data and push to UI
-- Prices shown here match exactly what the base game charges in atFadeFunction
local function getRecoveryData()
  local data = {
    balance = 0,
    hasInsurance = false,
    vehicleSlow = true,
    vehicleStopped = true,
    inPursuit = false,
    flipCost = flipUpRightCost,
    towToRoadCost = towToRoadCost,
    garages = {}
  }

  -- Get player balance
  if career_modules_playerAttributes then
    local attrs = career_modules_playerAttributes.getAttributeValue('money')
    if attrs then
      data.balance = attrs
    end
  end

  -- Check pursuit status
  if career_modules_playerDriving and career_modules_playerDriving.playerPursuitActive and career_modules_playerDriving.playerPursuitActive() then
    data.inPursuit = true
  end

  -- Check vehicle speed and insurance
  local veh = getPlayerVehicle(0)
  local invVehId = nil
  if veh then
    local speed = veh:getVelocity():len()
    data.vehicleSlow = speed < 10
    data.vehicleStopped = speed < 0.5

    -- Check roadside assistance insurance
    if career_modules_inventory then
      invVehId = career_modules_inventory.getInventoryIdFromVehicleId(veh:getID())
    end
    if invVehId and career_modules_insurance_insurance and career_modules_insurance_insurance.isRoadSideAssistanceFree then
      data.hasInsurance = career_modules_insurance_insurance.isRoadSideAssistanceFree(invVehId)
    end

    -- If insurance covers it, display as free (base game pays 0 for these)
    if data.hasInsurance then
      data.flipCost = 0
      data.towToRoadCost = 0
    end
  end

  -- Get available garages with prices matching base game's getPrice logic
  -- Base game getPrice returns: {money = {amount = getPriceForQuickTravelToGarage(garage)}}
  -- The baseTowToGarageCost is added for the display/radial menu but the actual
  -- payment amount in atFadeFunction uses getPrice() which returns travel price only.
  if freeroam_facilities and freeroam_facilities.getFacilitiesByType then
    local garages = freeroam_facilities.getFacilitiesByType('garage')
    if garages then
      for i, garage in ipairs(garages) do
        if not garage.noQuickTravel then
          local price = 0

          if data.hasInsurance then
            -- Insurance covers it — free
            price = 0
          else
            -- Mirror the EXACT return value of the base game's getPrice() function.
            if career_modules_quickTravel and career_modules_quickTravel.getPriceForQuickTravelToGarage then
              local travelPrice = career_modules_quickTravel.getPriceForQuickTravelToGarage(garage)
              if travelPrice then
                price = travelPrice
              end
            end
          end

          local garageName = garage.name or ('Garage ' .. i)
          if translateLanguage then
            garageName = translateLanguage(garage.name, garage.name, true)
          end

          table.insert(data.garages, {
            id = garage.id,
            name = garageName,
            price = price
          })
        end
      end
    end
  end

  guihooks.trigger('careerMPTabletRecoveryData', data)
  log('D', 'careerMPTablet', 'Recovery data pushed to UI: ' .. tostring(#data.garages) .. ' garages')
end

-- All recovery actions delegate to core_recoveryPrompt.buttonPressed()
-- which handles fade, sound, payment, teleport — exactly like the radial menu does.
-- We only do pre-checks here so we can show meaningful error messages in the tablet UI.

-- Recover vehicle to nearest road
local function recoverToRoad()
  local veh = getPlayerVehicle(0)
  if not veh then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'No vehicle found'})
    return
  end
  if veh:getVelocity():len() >= 10 then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'Stop or slow your vehicle first'})
    return
  end
  if career_modules_playerDriving and career_modules_playerDriving.playerPursuitActive and career_modules_playerDriving.playerPursuitActive() then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'Disabled during police chase'})
    return
  end

  -- Delegate to the game's own recovery system
  local target = {type = 'vehicle', vehId = veh:getID()}
  core_recoveryPrompt.buttonPressed('towToRoad', target)
  guihooks.trigger('careerMPTabletRecoveryResult', {success = true, message = 'Vehicle towed to nearest road'})
  hideTablet()
  M.pushDataToUI()
end

-- Flip vehicle upright
local function flipUpright()
  local veh = getPlayerVehicle(0)
  if not veh then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'No vehicle found'})
    return
  end
  if veh:getVelocity():len() >= 0.5 then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'Vehicle must be completely stopped'})
    return
  end
  if career_modules_playerDriving and career_modules_playerDriving.playerPursuitActive and career_modules_playerDriving.playerPursuitActive() then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'Disabled during police chase'})
    return
  end

  local target = {type = 'vehicle', vehId = veh:getID()}
  core_recoveryPrompt.buttonPressed('flipUpright', target)
  guihooks.trigger('careerMPTabletRecoveryResult', {success = true, message = 'Vehicle flipped upright'})
  hideTablet()
  M.pushDataToUI()
end

-- Tow vehicle to a specific garage
local function towToGarage(garageId)
  local veh = getPlayerVehicle(0)
  if not veh then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'No vehicle found'})
    return
  end
  if veh:getVelocity():len() >= 10 then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'Stop or slow your vehicle first'})
    return
  end
  if career_modules_playerDriving and career_modules_playerDriving.playerPursuitActive and career_modules_playerDriving.playerPursuitActive() then
    guihooks.trigger('careerMPTabletRecoveryResult', {success = false, message = 'Disabled during police chase'})
    return
  end

  -- Delegate entirely to the base game's stock recovery system for flawless integration
  local target = {type = 'vehicle', vehId = veh:getID()}
  core_recoveryPrompt.buttonPressed('towTo' .. garageId, target)
  
  guihooks.trigger('careerMPTabletRecoveryResult', {success = true, message = 'Vehicle towed to garage'})
  hideTablet()
  M.pushDataToUI()
end

-- ===== Profile System =====
local function getProfileData()
  local data = {
    saveSlot = "Unknown",
    server = "CareerMP Network",
    balance = 0,
    xp = 0,
    vouchers = 0,
    branches = {}
  }

  if MPCoreNetwork and MPCoreNetwork.getCurrentServer then
    local srv = MPCoreNetwork.getCurrentServer()
    if type(srv) == 'string' and srv ~= "" then
      data.server = srv
    elseif type(srv) == 'table' then
      data.server = srv.name or srv.sname or "CareerMP Network"
    end
  end

  if career_saveSystem and career_saveSystem.getCurrentSaveSlot then
    local slot, _ = career_saveSystem.getCurrentSaveSlot()
    if slot then data.saveSlot = slot end
  end

  if career_modules_playerAttributes then
    data.balance = career_modules_playerAttributes.getAttributeValue('money') or 0
    data.xp = career_modules_playerAttributes.getAttributeValue('beamXP') or 0
    data.vouchers = career_modules_playerAttributes.getAttributeValue('vouchers') or 0
  end

  if career_branches and career_branches.getBranchSimpleInfo then
    local domains = {'apm', 'freestyle', 'logistics', 'bmra'}
    local colors = {
      apm = 'amber',
      bmra = 'blue',
      logistics = 'green',
      freestyle = 'red'
    }
    local icons = {
      apm = '🏁',
      bmra = '⭐',
      logistics = '🚛',
      freestyle = '🔬'
    }
    for _, domain in ipairs(domains) do
      local info = career_branches.getBranchSimpleInfo(domain)
      if info and info.label then
        local branchName = info.label
        if translateLanguage then
          branchName = translateLanguage(branchName, branchName, true)
        end
        
        -- processPercent is a decimal 0.0-1.0
        local pct = (info.processPercent or 0) * 100
        table.insert(data.branches, {
          id = domain,
          name = branchName,
          level = info.level or 0,
          percent = pct,
          color = colors[domain] or 'gray',
          icon = icons[domain] or '📌'
        })
      end
    end
  end

  guihooks.trigger('careerMPTabletProfileData', data)
end

-- ===== Map & POI System =====
local function getMapData()
  local data = {
    levelName = "Unknown Map",
    vehicles = {},
    dealerships = {},
    garages = {},
    playerPos = nil,
    mapBounds = nil -- {minX, minY, maxX, maxY} computed from all POIs
  }

  -- Track all positions to compute bounds
  local allPositions = {}

  if core_levels and core_levels.getLevelByName and getCurrentLevelIdentifier then
    local levelId = getCurrentLevelIdentifier()
    if levelId and levelId ~= "" then
      local lvl = core_levels.getLevelByName(levelId)
      if lvl then
        if lvl.title then
          local title = lvl.title
          if translateLanguage then title = translateLanguage(title, title, true) end
          data.levelName = title
        end
        if lvl.minimap then
          data.minimap = lvl.minimap
        end
        if lvl.minimapImage then
          data.minimapImage = lvl.minimapImage
        end
        -- Fallback map bounds if level has size
        if lvl.size and type(lvl.size) == "table" and #lvl.size == 2 then
          data.levelSize = {lvl.size[1], lvl.size[2]}
        end
      end
    end
  end

  -- Get player position
  local playerVeh = getPlayerVehicle(0)
  if playerVeh then
    local pos = playerVeh:getPosition()
    if pos then
      data.playerPos = {x = pos.x, y = pos.y}
      -- Removed inserting playerPos into allPositions to ensure mapBounds remains completely static.
      -- If mapBounds dynamically grows, it breaks canvas path scaling vs POI rendering alignment.
    end
  end

  -- Get Vehicles
  if career_modules_inventory then
    local vehicles = career_modules_inventory.getVehicles()
    local spawnedVehId = nil
    local currentVeh = getPlayerVehicle(0)
    if currentVeh then
      spawnedVehId = career_modules_inventory.getInventoryIdFromVehicleId(currentVeh:getID())
    end

    if vehicles then
      for invId, vData in pairs(vehicles) do
        -- niceName is the display name, config may be a table so extract a string
        local configName = ""
        if type(vData.config) == "string" then
          configName = vData.config
        elseif type(vData.config) == "table" then
          configName = vData.config.Name or vData.config.name or ""
        end

        table.insert(data.vehicles, {
          id = invId,
          name = vData.niceName or ("Vehicle " .. tostring(invId)),
          config = configName,
          isSpawned = (tostring(invId) == tostring(spawnedVehId))
        })
      end
    end
  end

  -- Helper to get position and add to allPositions
  local function getFacilityPos(facility)
    local pos = freeroam_facilities.getAverageDoorPositionForFacility(facility)
    if pos then
      local p = {x = pos.x, y = pos.y}
      table.insert(allPositions, p)
      return p
    end
    return nil
  end

  -- Get Dealerships
  if freeroam_facilities and freeroam_facilities.getFacilitiesByType then
    local dealerships = freeroam_facilities.getFacilitiesByType('dealership')
    if dealerships then
      for _, d in ipairs(dealerships) do
        local dName = d.name or "Dealership"
        if translateLanguage then dName = translateLanguage(dName, dName, true) end
        local dDesc = d.description or "Vehicle sales and services"
        if translateLanguage then dDesc = translateLanguage(dDesc, dDesc, true) end
        table.insert(data.dealerships, {
          id = d.id,
          name = dName,
          desc = dDesc,
          fee = d.markup or 0,
          pos = getFacilityPos(d)
        })
      end
    end

    -- Get Garages & Computers
    local garages = freeroam_facilities.getFacilitiesByType('garage')
    if garages then
      for _, g in ipairs(garages) do
        local gName = g.name or "Garage"
        if translateLanguage then gName = translateLanguage(gName, gName, true) end
        local gDesc = g.description or "Vehicle repairs and parts"
        if translateLanguage then gDesc = translateLanguage(gDesc, gDesc, true) end
        table.insert(data.garages, {
          id = g.id,
          name = gName,
          desc = gDesc,
          isComputer = false,
          pos = getFacilityPos(g)
        })
      end
    end
    
    local computers = freeroam_facilities.getFacilitiesByType('computer')
    if computers then
      for _, c in ipairs(computers) do
        local cName = c.name or "Computer"
        if translateLanguage then cName = translateLanguage(cName, cName, true) end
        local cDesc = c.description or "Access to the vehicle network"
        if translateLanguage then cDesc = translateLanguage(cDesc, cDesc, true) end
        table.insert(data.garages, {
          id = c.id,
          name = cName,
          desc = cDesc,
          isComputer = true,
          pos = getFacilityPos(c)
        })
      end
    end
  end

  -- Compute map bounds from all known positions with padding
  if #allPositions > 0 then
    local minX, minY = math.huge, math.huge
    local maxX, maxY = -math.huge, -math.huge
    for _, p in ipairs(allPositions) do
      if p.x < minX then minX = p.x end
      if p.y < minY then minY = p.y end
      if p.x > maxX then maxX = p.x end
      if p.y > maxY then maxY = p.y end
    end
    -- Add 15% padding
    local padX = (maxX - minX) * 0.15
    local padY = (maxY - minY) * 0.15
    -- Ensure minimum extent
    if padX < 100 then padX = 100 end
    if padY < 100 then padY = 100 end
    data.mapBounds = {
      minX = minX - padX,
      minY = minY - padY,
      maxX = maxX + padX,
      maxY = maxY + padY
    }
  end

  -- Get active live GPS route from core_groundMarkers
  local routeData = {}
  if core_groundMarkers and core_groundMarkers.routePlanner and core_groundMarkers.routePlanner.path then
    for _, e in ipairs(core_groundMarkers.routePlanner.path) do
      if e.pos then
        table.insert(routeData, math.floor(e.pos.x * 10) / 10)
        table.insert(routeData, math.floor(e.pos.y * 10) / 10)
      end
    end
  end
  data.route = routeData

  guihooks.trigger('careerMPTabletMapData', data)
end

-- Future: send career data to the UI
local function pushDataToUI()
  local data = {
    balance = 0,
    xp = 0,
    vehicle = "None"
  }
  
  if career_modules_playerAttributes then
    data.balance = career_modules_playerAttributes.getAttributeValue('money') or 0
    data.xp = career_modules_playerAttributes.getAttributeValue('beamXP') or 0
  end
  
  local veh = getPlayerVehicle(0)
  if veh and career_modules_inventory then
    local invId = career_modules_inventory.getInventoryIdFromVehicleId(veh:getID())
    if invId then
      local vehData = career_modules_inventory.getVehicles()[invId]
      if vehData and vehData.niceName then
        data.vehicle = vehData.niceName
      end
    end
  end
  
  guihooks.trigger('careerMPTabletData', data)
end

-- ===== Minimap Overlay =====
local function showMinimap(x, y, w, h)
  -- x, y, w, h are screen fractions (0.0 - 1.0)
  if ui_apps_minimap and ui_apps_minimap.setDrawTransform then
    ui_apps_minimap.setDrawTransform(x, y, w, h)
    log('D', 'careerMPTablet', string.format('Minimap shown at: %.3f, %.3f, %.3f, %.3f', x, y, w, h))
  else
    log('W', 'careerMPTablet', 'ui_apps_minimap not available')
  end
end

local function hideMinimap()
  if ui_apps_minimap and ui_apps_minimap.hide then
    ui_apps_minimap.hide()
    log('D', 'careerMPTablet', 'Minimap hidden')
  end
end

-- ===== Waypoint Navigation =====
local function setWaypoint(facilityType, facilityId)
  log('I', 'careerMPTablet', 'Setting waypoint for: ' .. tostring(facilityType) .. ' / ' .. tostring(facilityId))
  
  if not freeroam_facilities then
    log('W', 'careerMPTablet', 'freeroam_facilities not available')
    return
  end

  local facility = nil
  if facilityType == 'dealership' then
    facility = freeroam_facilities.getDealership(facilityId)
  elseif facilityType == 'garage' then
    facility = freeroam_facilities.getGarage(facilityId)
  elseif facilityType == 'computer' then
    -- Computers don't have a dedicated getter, search by type
    local computers = freeroam_facilities.getFacilitiesByType('computer')
    if computers then
      for _, c in ipairs(computers) do
        if c.id == facilityId then
          facility = c
          break
        end
      end
    end
  end

  if not facility then
    log('W', 'careerMPTablet', 'Facility not found: ' .. tostring(facilityId))
    guihooks.trigger('careerMPTabletNotification', {message = 'Facility not found', type = 'error'})
    return
  end

  -- Get the facility's door position for navigation
  local facName = facility.name or facilityId
  if translateLanguage then facName = translateLanguage(facName, facName, true) end

  local pos = freeroam_facilities.getAverageDoorPositionForFacility(facility)
  if pos then
    -- Use the modern setPath API with the position as a waypoint
    if core_groundMarkers and core_groundMarkers.setPath then
      -- Find closest road node to the facility position
      local wp = nil
      if map and map.findClosestRoad then
        wp = map.findClosestRoad(pos)
      end
      if wp then
        core_groundMarkers.setPath({wp})
      end
      log('I', 'careerMPTablet', 'Waypoint set for: ' .. tostring(facName))
      guihooks.trigger('careerMPTabletNotification', {message = 'Navigating to ' .. facName, type = 'success'})
    end
  else
    log('W', 'careerMPTablet', 'No position found for facility: ' .. tostring(facilityId))
    guihooks.trigger('careerMPTabletNotification', {message = 'Could not find location', type = 'error'})
  end
end

-- ===== Road Network System =====
local cachedRoadData = nil
local cachedRoadLevel = nil

local function getRoadData()
  local levelId = ""
  if getCurrentLevelIdentifier then
    levelId = getCurrentLevelIdentifier()
  end
  
  -- Use cache if level hasn't changed
  if cachedRoadLevel == levelId and cachedRoadData then
    guihooks.trigger('careerMPTabletRoadData', cachedRoadData)
    return
  end
  
  cachedRoadLevel = levelId
  cachedRoadData = {}
  local addedEdges = {}
  
  local mapData = map and map.getMap()
  if mapData and mapData.nodes then
    for nid, n in pairs(mapData.nodes) do
      for lid, data in pairs(n.links) do
        if data.hiddenInNavi then goto continue end
        
        -- Deduplicate bidirectional edges to halve payload size, without losing one-way roads
        local edgeKey = tostring(nid) < tostring(lid) and (tostring(nid).."_"..tostring(lid)) or (tostring(lid).."_"..tostring(nid))
        if addedEdges[edgeKey] then goto continue end
        addedEdges[edgeKey] = true
        
        local n2 = mapData.nodes[lid]
        if n2 then
          local drivability = data.drivability or 1
          local roadType = 1 -- Normal
          if drivability < 0.01 then roadType = 3 -- Dirt/Trail
          elseif drivability < 0.9 then roadType = 2 end -- Low drivability
          
          -- Round to 1 decimal place to save JSON payload size
          table.insert(cachedRoadData, math.floor(n.pos.x * 10) / 10)
          table.insert(cachedRoadData, math.floor(n.pos.y * 10) / 10)
          table.insert(cachedRoadData, math.floor(n2.pos.x * 10) / 10)
          table.insert(cachedRoadData, math.floor(n2.pos.y * 10) / 10)
          table.insert(cachedRoadData, roadType)
        end
        ::continue::
      end
    end
  end
  
  log('I', 'careerMPTablet', 'Pushed road data for ' .. levelId .. ' (' .. tostring(#cachedRoadData / 5) .. ' segments)')
  guihooks.trigger('careerMPTabletRoadData', cachedRoadData)
end

M.onExtensionLoaded = onExtensionLoaded
M.onUpdate = onUpdate
M.refreshTablet = refreshTablet
M.getProfileData = getProfileData
M.getMapData = getMapData

local function getPlayerPosition()
  local playerVeh = getPlayerVehicle(0)
  if playerVeh then
    local pos = playerVeh:getPosition()
    if pos then
      return {x = pos.x, y = pos.y}
    end
  end
  return nil
end
M.getPlayerPosition = getPlayerPosition

M.toggleTablet = toggleTablet
M.showTablet = showTablet
M.hideTablet = hideTablet
M.saveSettings = saveSettings
M.requestSettings = requestSettings
M.getRecoveryData = getRecoveryData
M.recoverToRoad = recoverToRoad
M.flipUpright = flipUpright
M.towToGarage = towToGarage
M.pushDataToUI = pushDataToUI
M.showMinimap = showMinimap
M.hideMinimap = hideMinimap
M.setWaypoint = setWaypoint
M.getRoadData = getRoadData

return M
