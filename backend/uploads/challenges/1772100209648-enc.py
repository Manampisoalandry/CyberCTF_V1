from pathlib import Path
import random
import hashlib
import struct

FLAG = "CCOI26{REDACTED}"
PARTS = 4
KEY_MIN = 1
KEY_MAX = 80

vals = [ord(c) for c in FLAG]
n = len(vals)

sizes = [n // PARTS] * PARTS
for i in range(n % PARTS):
    sizes[i] += 1

plain_chunks = []
p = 0
for s in sizes:
    plain_chunks.append(vals[p:p + s])
    p += s

keys = [random.randint(KEY_MIN, KEY_MAX) for _ in range(PARTS)]
salts = [random.randint(0, 255) for _ in range(PARTS)]
ivs = [random.randint(0, 255) for _ in range(PARTS)]

enc_chunks = []
for part_idx, chunk in enumerate(plain_chunks):
    k = keys[part_idx]
    salt = salts[part_idx]
    prev = ivs[part_idx]
    out = bytearray()
    for i, v in enumerate(chunk):
        x = (v + i) & 255
        x = ((x << 3) | (x >> 5)) & 255
        ks = hashlib.sha256(bytes([k, salt, part_idx, i])).digest()[0]
        x ^= ks
        x ^= prev
        x = (x + ((part_idx + 1) * 7)) & 255
        out.append(x)
        prev = x
    enc_chunks.append(bytes(out))

perm = list(range(PARTS))
random.shuffle(perm)

payload = bytearray()
payload += b"CHK2"
payload += bytes([PARTS])
payload += bytes(sizes)
payload += bytes(perm)
payload += bytes(salts)
payload += bytes(ivs)

for idx in perm:
    payload += enc_chunks[idx]

Path("challenge.bin").write_bytes(bytes(payload))
print(bytes(payload).hex())
print("keys =", keys)
print("sizes =", sizes)
print("perm =", perm)
print("salts =", salts)
print("ivs =", ivs)