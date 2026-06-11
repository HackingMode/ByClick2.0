import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.models import Provincia, Municipio

def seed_angola_21():
    db = SessionLocal()
    try:
        # Nova Divisão Político-Administrativa (21 Províncias)
        # Adaptado com base na Lei 14/24 (Entrada em vigor em 2025)
        angola_data = {
            "Bengo": ["Dande", "Bula Atumba", "Dembos", "Nambuangongo", "Pango Aluquém", "Caxito"],
            "Benguela": ["Benguela", "Baía Farta", "Balombo", "Bocoio", "Caimbambo", "Catumbela", "Chongorói", "Cubal", "Ganda", "Lobito"],
            "Bié": ["Kuito", "Andulo", "Camacupa", "Catabola", "Chinguar", "Chitembo", "Cuemba", "Cunhinga", "N'harea"],
            "Cabinda": ["Cabinda", "Belize", "Buco-Zau", "Cacongo"],
            "Cuando": ["Mavinga", "Dirico", "Rivungo"], # Divisão do Cuando Cubango (Leste)
            "Cubango": ["Menongue", "Cuito Cuanavale", "Cuchi", "Cuangar", "Nancova", "Calai"], # Divisão do Cuando Cubango (Oeste)
            "Cuanza Norte": ["Cazengo", "Ambaca", "Banga", "Bolongongo", "Cambambe", "Golungo Alto", "Gonguembo", "Lucala", "Quiculungo", "Samba Caju"],
            "Cuanza Sul": ["Sumbe", "Amboim", "Cassongue", "Cela", "Conda", "Ebo", "Libolo", "Mussende", "Porto Amboim", "Quibala", "Quilenda", "Seles"],
            "Cunene": ["Cuanhama", "Cahama", "Curoca", "Cuvelai", "Namacunde", "Ombadja"],
            "Huambo": ["Huambo", "Bailundo", "Caála", "Catchiungo", "Chicala-Choloanga", "Chinjenje", "Ecunha", "Longonjo", "Londuimbali", "Mungo", "Ucuma"],
            "Huíla": ["Lubango", "Caconda", "Cacula", "Caluquembe", "Gambos", "Chibia", "Chicomba", "Chipindo", "Cuvango", "Humpata", "Jamba", "Matala", "Quilengues", "Quipungo"],
            "Ícolo e Bengo": ["Ícolo e Bengo", "Quiçama"], # Nova província separada de Luanda
            "Luanda": ["Luanda", "Belas", "Cacuaco", "Cazenga", "Kilamba Kiaxi", "Talatona", "Viana"],
            "Lunda Norte": ["Chitato", "Cambulo", "Capenda-Camulemba", "Caungula", "Cuango", "Cuílo", "Lóvua", "Lubalo", "Lucapa", "Xá-Muteba"],
            "Lunda Sul": ["Saurimo", "Cacolo", "Dala", "Muconda"],
            "Malanje": ["Malanje", "Cacuso", "Calandula", "Cambundi-Catembo", "Cangandala", "Caombo", "Cuaba Nzogo", "Cunda-Dia-Baze", "Luquembo", "Marimba", "Massango", "Mucari", "Quela", "Quirima"],
            "Moxico": ["Moxico", "Camanongue", "Léua", "Luchazes", "Alto Zambeze"], # Província Oeste do Moxico
            "Moxico Leste": ["Luau", "Luacano", "Bundas", "Alto Zambeze (Leste)"], # Cassai Zambeze / Moxico Leste
            "Namibe": ["Moçâmedes", "Bibala", "Camucuio", "Tômbwa", "Virei"],
            "Uíge": ["Uíge", "Alto Cauale", "Ambuila", "Bembe", "Buengas", "Bungo", "Damba", "Maquela do Zombo", "Milunga", "Mucaba", "Negage", "Puri", "Quimbele", "Quitexe", "Sanza Pombo", "Songo"],
            "Zaire": ["M'banza Kongo", "Cuimba", "Nóqui", "N'zeto", "Soyo", "Tomboco"]
        }

        print("A limpar tabela de municípios...")
        db.query(Municipio).delete()
        print("A limpar tabela de províncias...")
        db.query(Provincia).delete()
        db.commit()

        print("A popular base de dados com as novas 21 Províncias e os respectivos municípios...")
        for prov_nome, municipios in angola_data.items():
            prov = Provincia(nome=prov_nome)
            db.add(prov)
            db.commit()
            db.refresh(prov)
            
            for mun_nome in municipios:
                mun = Municipio(nome=mun_nome, provincia_id=prov.id)
                db.add(mun)
            db.commit()

        print("Nova divisão administrativa (21 Províncias) inserida com sucesso!")

    except Exception as e:
        print(f"Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_angola_21()
