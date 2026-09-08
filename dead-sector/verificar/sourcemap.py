#!/usr/bin/env python3
"""Genera sourcemap.json al estilo Rojo desde el árbol de archivos.

luau-lsp necesita saber qué instancia es cada archivo para resolver
require(ReplicatedStorage.Types). Rojo genera este archivo; como el proyecto usa
Script Sync y no Rojo, se genera acá con las mismas reglas de nombres.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def node_for_dir(dirpath, name, class_name):
    node = {"name": name, "className": class_name, "children": []}
    for entry in sorted(os.listdir(dirpath)):
        full = os.path.join(dirpath, entry)
        rel = os.path.relpath(full, ROOT)
        if os.path.isdir(full):
            node["children"].append(node_for_dir(full, entry, "Folder"))
        elif entry.endswith(".server.luau"):
            node["children"].append({"name": entry[:-12], "className": "Script", "filePaths": [rel]})
        elif entry.endswith(".client.luau"):
            node["children"].append({"name": entry[:-12], "className": "LocalScript", "filePaths": [rel]})
        elif entry.endswith(".luau"):
            node["children"].append({"name": entry[:-5], "className": "ModuleScript", "filePaths": [rel]})
    return node


def main():
    os.chdir(ROOT)
    tree = {
        "name": "DataModel",
        "className": "DataModel",
        "children": [
            node_for_dir("ReplicatedStorage", "ReplicatedStorage", "ReplicatedStorage"),
            node_for_dir("ServerScriptService", "ServerScriptService", "ServerScriptService"),
            {"name": "StarterPlayer", "className": "StarterPlayer", "children": [
                node_for_dir("StarterPlayerScripts", "StarterPlayerScripts", "StarterPlayerScripts")
            ]},
        ],
    }
    with open("sourcemap.json", "w") as handle:
        json.dump(tree, handle, indent=1)
    print("sourcemap.json actualizado")


if __name__ == "__main__":
    sys.exit(main())
