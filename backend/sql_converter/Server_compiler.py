import sys
import os
import re
import shutil
import paramiko
from datetime import datetime
from sp_converter import SPConverter
from typing import Tuple

def run_db2_connector(local_file_path: str, input_file_path: str, output_file_path: str):
    host = "9.30.122.32"
    port = 22
    username = "root"
    password = "Rajisthanisgreat@777I"
    remote_dir = "/home/db2inst1/converter_store/"
    remote_input_file = remote_dir + "input.sql"
    remote_output_file = remote_dir + "output2.sql"

    db2_commands = f"""
    su - db2inst1 -c '
    source /home/db2inst1/sqllib/db2profile;
    db2 connect to schooldb;
    db2 set schema myschema;
    cd {remote_dir};
    touch input.sql;
    rm -f output2.sql;
    db2 -q -td@ -z output2.sql < input.sql;
    '
    """

    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname=host, port=port, username=username, password=password)
        print("✅ SSH connection established.")

        sftp = ssh.open_sftp()
        sftp.put(local_file_path, remote_input_file)
        print("📤 Uploaded to remote DB2 server.")

        print("🚀 Running DB2 command remotely...")
        stdin, stdout, stderr = ssh.exec_command(db2_commands)
        stdout.channel.recv_exit_status()
        print("✅ DB2 compilation completed.")

        sftp.get(remote_output_file, output_file_path)
        sftp.close()

        with open(output_file_path, "r") as f:
            output_lines = [line.strip() for line in f.readlines() if line.strip()]
            print("\n=== 📄 DB2 Output ===")
            print("\n".join(output_lines))

        # match = re.search(r"TD(\d+)", os.path.basename(input_file_path), re.IGNORECASE)
        # error_num = match.group(1) if match else "UNKNOWN"
        # error_dir = os.path.join(os.getcwd(), "Errors")
        # os.makedirs(error_dir, exist_ok=True)
        # error_file_path = os.path.join(error_dir, f"DB2_error{error_num}.sql")
        # shutil.copyfile(output_file_path, error_file_path)
        # print(f"📂 Error report saved to: {error_file_path}")

        if output_lines and output_lines[-1].startswith("DB20000I"):
            print("✅ DB2 execution successful.")
        else:
            print("❌ DB2 reported a failure. Check the error file.")

    except Exception as e:
        print(f"❌ SSH/DB2 execution error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python compiler.py <inputfile> <outputfile>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    run_db2_connector(input_file, input_file, output_file)
