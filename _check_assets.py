import json, os, subprocess

assets_dir = "/mnt/c/Users/user/james-banana/src/assets"
for f in os.listdir(assets_dir):
    path = os.path.join(assets_dir, f)
    try:
        with open(path) as fh:
            d = json.load(fh)
            print(f"{f}: size={d.get('size')}, url={d.get('url')}, r2_key={d.get('r2_key')}")
    except:
        print(f"{f}: not JSON or unreadable")
