export const CLAIM_SLOT_SCRIPT = `
local meta_key = KEYS[1]
local slots_key = KEYS[2]
local claimed_emails_key = KEYS[3]
local map_username_email_key = KEYS[4]

local email = ARGV[1]
local username = ARGV[2]
local current_time = tonumber(ARGV[3])

-- Check if sale started
local start_time = tonumber(redis.call('HGET', meta_key, 'start_time'))
if not start_time then return -1 end
if current_time < start_time then return -2 end

-- Prevent duplicate claims and resolve missing emails
if email ~= nil and email ~= '' then
    if redis.call('SISMEMBER', claimed_emails_key, email) == 1 then 
        return -3 -- Email already claimed
    end
elseif username ~= nil and username ~= '' then
    email = redis.call('HGET', map_username_email_key, username)
    
    if not email then 
        return -6 -- Username not found in mapping
    end
    
    if redis.call('SISMEMBER', claimed_emails_key, email) == 1 then 
        return -4 -- Mapped email already claimed
    end 
else 
    return -5 -- Neither email nor username provided
end

-- Pop an empty row ID from pre-allocated pool
local allocated_row_id = redis.call('RPOP', slots_key)
if not allocated_row_id then 
    return -7 -- Pool is empty
end

-- Track that this email has claimed a slot
redis.call('SADD', claimed_emails_key, email)

-- Return the email
return email
`;
