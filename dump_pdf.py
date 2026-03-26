import PyPDF2

pdf_path = r"c:\Users\Dell\Desktop\Interview_Report_Sumanth_20260120_121111.pdf"

with open(pdf_path, 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    print(f"Total Pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"\n--- PAGE {i+1} ---")
        print(page.extract_text())
