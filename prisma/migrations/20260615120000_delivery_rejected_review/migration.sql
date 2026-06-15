-- Add the DELIVERY_REJECTED_REVIEW return status: a delivery partner rejected a
-- second-hand item at pickup/verification, holding it for an admin to KEEP it in
-- the store (relist) or REMOVE it from the store completely.
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_REJECTED_REVIEW';
