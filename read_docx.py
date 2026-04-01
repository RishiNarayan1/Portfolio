import zipfile
import xml.etree.ElementTree as ET
import sys
import traceback

def extract_text():
    try:
        docx_path = sys.argv[1]
        output_path = sys.argv[2]
        document = zipfile.ZipFile(docx_path)
        xml_content = document.read('word/document.xml')
        document.close()
        tree = ET.XML(xml_content)
        namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        paragraphs = []
        for paragraph in tree.iterfind('.//w:p', namespaces):
            texts = [node.text for node in paragraph.iterfind('.//w:t', namespaces) if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write('\n'.join(paragraphs))
    except Exception as e:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(str(e) + "\n" + traceback.format_exc())

if __name__ == '__main__':
    extract_text()
