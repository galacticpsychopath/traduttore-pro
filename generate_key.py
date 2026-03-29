# we will use this so our key, a string, can be coded
# and changed to hex to keep it safe
import secrets

# token_hex(16) = 32 characters, token_hex(32) = 64 characters — 32 is safer for JWT
print(secrets.token_hex(32))