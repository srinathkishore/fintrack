import os


def write_folder_contents_recursive(folder_path, output_file, exclude_files=None):
    if exclude_files is None:
        exclude_files = []

    with open(output_file, "w", encoding="utf-8") as out:
        for root, dirs, files in os.walk(folder_path):
            for filename in files:

                # Skip excluded files
                if filename in exclude_files:
                    continue

                file_path = os.path.join(root, filename)

                out.write(f"===== {file_path} =====\n")

                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    out.write(content + "\n\n")
                except Exception as e:
                    out.write(f"[Could not read file: {e}]\n\n")

    print(f"Finished writing contents to {output_file}")


write_folder_contents_recursive(
    folder_path="C:\\Users\\Srinath\\Desktop\\Rough Works\\Practice\\BudgetTracker",
    output_file="C:\\Users\\Srinath\Desktop\\Rough Works\\Practice\\BudgetTracker\\all_files.txt",
    exclude_files=["all_files.txt", "script.py"],
)
