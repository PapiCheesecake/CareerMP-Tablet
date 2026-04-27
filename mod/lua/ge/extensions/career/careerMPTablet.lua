-- CareerMP Tablet — Lua Extension
-- Handles toggle visibility and future game data hooks

local M = {}
M.dependencies = {}

local isVisible = false

local function onExtensionLoaded()
  log('I', 'careerMPTablet', 'CareerMP Tablet extension loaded')
end

-- Toggle the tablet app visibility via custom UI event
local function toggleTablet()
  isVisible = not isVisible
  guihooks.trigger('careerMPTabletToggle', isVisible)
  log('D', 'careerMPTablet', 'Tablet visibility: ' .. tostring(isVisible))
end

-- Show the tablet
local function showTablet()
  isVisible = true
  guihooks.trigger('careerMPTabletToggle', true)
end

-- Hide the tablet
local function hideTablet()
  -- need to figure out how to get the menu to close when pressing escape. or entering a menu.
  isVisible = false
  guihooks.trigger('careerMPTabletToggle', false)
end

-- Future: send career data to the UI
local function pushDataToUI()
  -- Placeholder for Phase 2 data hooks
  -- Will read from career modules and push via guihooks
end

M.onExtensionLoaded = onExtensionLoaded
M.toggleTablet = toggleTablet
M.showTablet = showTablet
M.hideTablet = hideTablet

return M
