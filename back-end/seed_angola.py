import os
import sys
from sqlalchemy.orm import Session

# Adicionar o diretório raiz ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.models import Provincia, Municipio

def seed_angola():
    db = SessionLocal()
    try:
        angola_data = {
            "Bengo": ["Dande", "Bula Atumba", "Dembos", "Nambuangongo", "Pango Aluquém", "Caxito"],
            "Benguela": ["Benguela", "Baía Farta", "Balombo", "Bocoio", "Caimbambo", "Catumbela", "Chongorói", "Cubal", "Ganda", "Lobito"],
            "Bié": ["Kuito", "Andulo", "Camacupa", "Catabola", "Chinguar", "Chitembo", "Cuemba", "Cunhinga", "N'harea"],
            "Cabinda": ["Cabinda", "Belize", "Buco-Zau", "Cacongo"],
            "Cuando Cubango": ["Menongue", "Calai", "Cuangar", "Cuchi", "Cuito Cuanavale", "Dirico", "Mavinga", "Nancova", "Rivungo"],
            "Cuanza Norte": ["Cazengo", "Ambaca", "Banga", "Bolongongo", "Cambambe", "Golungo Alto", "Gonguembo", "Lucala", "Quiculungo", "Samba Caju"],
            "Cuanza Sul": ["Sumbe", "Amboim", "Cassongue", "Cela", "Conda", "Ebo", "Libolo", "Mussende", "Porto Amboim", "Quibala", "Quilenda", "Seles"],
            "Cunene": ["Cuanhama", "Cahama", "Curoca", "Cuvelai", "Namacunde", "Ombadja"],
            "Huambo": ["Huambo", "Bailundo", "Caála", "Catchiungo", "Chicala-Choloanga", "Chinjenje", "Ecunha", "Longonjo", "Londuimbali", "Mungo", "Ucuma"],
            "Huíla": ["Lubango", "Caconda", "Cacula", "Caluquembe", "Gambos", "Chibia", "Chicomba", "Chipindo", "Cuvango", "Humpata", "Jamba", "Matala", "Quilengues", "Quipungo"],
            "Luanda": ["Luanda", "Belas", "Cacuaco", "Cazenga", "Ícolo e Bengo", "Kilamba Kiaxi", "Quiçama", "Talatona", "Viana"],
            "Lunda Norte": ["Chitato", "Cambulo", "Capenda-Camulemba", "Caungula", "Cuango", "Cuílo", "Lóvua", "Lubalo", "Lucapa", "Xá-Muteba"],
            "Lunda Sul": ["Saurimo", "Cacolo", "Dala", "Muconda"],
            "Malanje": ["Malanje", "Cacuso", "Calandula", "Cambundi-Catembo", "Cangandala", "Caombo", "Cuaba Nzogo", "Cunda-Dia-Baze", "Luquembo", "Marimba", "Massango", "Mucari", "Quela", "Quirima"],
            "Moxico": ["Moxico", "Alto Zambeze", "Bundas", "Camanongue", "Léua", "Luau", "Luacano", "Luchazes"],
            "Namibe": ["Moçâmedes", "Bibala", "Camucuio", "Tômbwa", "Virei"],
            "Uíge": ["Uíge", "Alto Cauale", "Ambuila", "Bembe", "Buengas", "Bungo", "Damba", "Maquela do Zombo", "Milunga", "Mucaba", "Negage", "Puri", "Quimbele", "Quitexe", "Sanza Pombo", "Songo"],
            "Zaire": ["M'banza Kongo", "Cuimba", "Nóqui", "N'zeto", "Soyo", "Tomboco"]
        }

        for prov_nome, municipios in angola_data.items():
            prov = db.query(Provincia).filter(Provincia.nome == prov_nome).first()
            if not prov:
                prov = Provincia(nome=prov_nome)
                db.add(prov)
                db.commit()
                db.refresh(prov)
            
            for mun_nome in municipios:
                mun = db.query(Municipio).filter(Municipio.nome == mun_nome, Municipio.provincia_id == prov.id).first()
                if not mun:
                    mun = Municipio(nome=mun_nome, provincia_id=prov.id)
                    db.add(mun)
            db.commit()

        print("Províncias e Municípios de Angola atualizados com sucesso!")

    except Exception as e:
        print(f"Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_angola()
