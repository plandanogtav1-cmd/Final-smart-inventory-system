-- Add forecast accuracy tracking
CREATE TABLE IF NOT EXISTS forecast_accuracy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  forecast_date date,
  predicted_demand integer,
  actual_demand integer,
  accuracy_percentage decimal(5,2),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE forecast_accuracy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage forecast accuracy"
  ON forecast_accuracy FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);