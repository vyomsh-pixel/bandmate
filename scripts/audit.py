import os
import json
from pathlib import Path

def print_header(title):
    print(f"\n{'='*50}\n{title}\n{'='*50}")

def audit_dependencies(root_dir):
    print_header("Dependencies Audit")
    pkg_path = os.path.join(root_dir, "package.json")
    if not os.path.exists(pkg_path):
        print("No package.json found.")
        return
        
    with open(pkg_path, 'r') as f:
        pkg = json.load(f)
        
    deps = pkg.get("dependencies", {})
    dev_deps = pkg.get("devDependencies", {})
    
    print(f"Production Dependencies ({len(deps)}):")
    for d, v in deps.items():
        print(f"  - {d}: {v}")
        
    print(f"\nDev Dependencies ({len(dev_deps)}):")
    for d, v in dev_deps.items():
        print(f"  - {d}: {v}")

def audit_file_structure(root_dir):
    print_header("File Structure Overview")
    important_dirs = ['app', 'components', 'lib', 'hooks']
    
    for d in important_dirs:
        dir_path = os.path.join(root_dir, d)
        if os.path.exists(dir_path):
            count = sum(len(files) for _, _, files in os.walk(dir_path))
            print(f"{d}/: {count} files")
        else:
            print(f"{d}/: Not found")

def main():
    # Assuming script runs from root or scripts folder
    current_dir = Path(os.getcwd())
    root_dir = current_dir.parent if current_dir.name == 'scripts' else current_dir
    
    print("Starting basic audit...")
    audit_dependencies(root_dir)
    audit_file_structure(root_dir)
    
if __name__ == "__main__":
    main()
