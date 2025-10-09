-- Add auction sale fields to pawn_items table
-- These fields will store complete sale information when an item is sold at auction

ALTER TABLE pawn_items 
ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS buyer_contact VARCHAR(50),
ADD COLUMN IF NOT EXISTS sale_notes TEXT,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_price DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS received_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS change_amount DECIMAL(15,2);

-- Add comment for documentation
COMMENT ON COLUMN pawn_items.buyer_name IS 'Name of the buyer when item is sold';
COMMENT ON COLUMN pawn_items.buyer_contact IS 'Contact number of the buyer';
COMMENT ON COLUMN pawn_items.sale_notes IS 'Additional notes about the sale';
COMMENT ON COLUMN pawn_items.discount_amount IS 'Discount given on auction price';
COMMENT ON COLUMN pawn_items.final_price IS 'Final price after discount';
COMMENT ON COLUMN pawn_items.received_amount IS 'Amount received from buyer';
COMMENT ON COLUMN pawn_items.change_amount IS 'Change given to buyer';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pawn_items_buyer_name ON pawn_items(buyer_name);
CREATE INDEX IF NOT EXISTS idx_pawn_items_sold_date ON pawn_items(sold_date);
