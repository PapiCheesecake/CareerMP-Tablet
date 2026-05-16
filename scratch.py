import zipfile

with zipfile.ZipFile(r'E:\SteamLibrary\steamapps\common\BeamNG.drive\content\levels\west_coast_usa.zip') as z:
    txt = z.read('levels/west_coast_usa/info.json').decode('utf-8')
    idx = txt.find('"minimapImage"')
    if idx != -1:
        print(txt[idx:idx+100])
    
    idx2 = txt.find('"minimap"')
    if idx2 != -1:
        print(txt[idx2:idx2+200])
