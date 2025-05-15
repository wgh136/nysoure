import subprocess
import os
import shutil

if os.path.exists("build"):
    shutil.rmtree("build")
os.mkdir("build")

subprocess.run(["go", "build", "-o", "build/", "main.go"])

os.chdir("./frontend")
subprocess.run(["npm", "install"], shell=True)
subprocess.run(["npm", "run", "build"], shell=True)
os.chdir("..")
shutil.copytree("./frontend/dist", "./build/static")