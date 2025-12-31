-- Clear all old forecasts to force regeneration with external data
DELETE FROM forecasts;

-- Clear all external data to start fresh
DELETE FROM external_data;