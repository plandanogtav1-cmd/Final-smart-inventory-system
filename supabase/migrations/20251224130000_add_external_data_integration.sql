-- External data integration tables
CREATE TABLE IF NOT EXISTS external_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type varchar(50) NOT NULL, -- 'weather', 'holiday', 'economic'
  date date NOT NULL,
  data_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Product external factors mapping
CREATE TABLE IF NOT EXISTS product_external_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  factor_type varchar(50) NOT NULL, -- 'weather_sensitive', 'holiday_boost', 'economic_sensitive'
  impact_multiplier decimal(3,2) DEFAULT 1.0, -- 0.5 = 50% impact, 1.5 = 150% boost
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE external_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_external_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage external data"
  ON external_data FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage product factors"
  ON product_external_factors FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);