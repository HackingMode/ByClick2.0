import asyncio
from app.core.database import SessionLocal
from app.models.models import Provincia, Municipio

# As 21 provincias de Angola (Nova Divisão Político-Administrativa 2025)
PROVINCIAS_ANGOLA = {
    "Bengo": ["Caxito", "Dande", "Ambriz", "Nambuangongo", "Demabos", "Bula Atumba", "Pango Aluquém"],
    "Benguela": ["Benguela", "Lobito", "Catumbela", "Baía Farta", "Balombo", "Bocoio", "Caimbambo", "Chongoroi", "Cubal", "Ganda"],
    "Bié": ["Kuito", "Andulo", "Camacupa", "Catabola", "Chinguar", "Chitembo", "Cuemba", "Cunhinga", "Nharea"],
    "Cabinda": ["Cabinda", "Cacongo", "Buco-Zau", "Belize"],
    "Cuando": ["Mavinga", "Rivungo", "Dirico", "Mucusso", "Luiana"],
    "Cubango": ["Menongue", "Caiundo", "Calai", "Cuangar", "Cuchi", "Cutato", "Longa", "Mavengue", "Nancova", "Savate", "Chinguanja"],
    "Cuanza Norte": ["Ndalatando", "Ambaca", "Banga", "Bolongongo", "Cambambe", "Cazengo", "Golungo Alto", "Gonguembo", "Lucala", "Quiculungo", "Samba Caju"],
    "Cuanza Sul": ["Sumbe", "Porto Amboim", "Amboim", "Cassongue", "Cela", "Conda", "Ebo", "Libolo", "Mussende", "Quibala", "Quilenda", "Seles"],
    "Cunene": ["Ondjiva", "Cahama", "Curoca", "Cuvelai", "Namacunde", "Ombadja"],
    "Huambo": ["Huambo", "Caála", "Bailundo", "Catchiungo", "Ekunha", "Longonjo", "Londuimbali", "Mungo", "Tchicala Tcholohanga", "Tchindjenje", "Ucuma"],
    "Huíla": ["Lubango", "Caconda", "Cacula", "Caluquembe", "Chiange", "Chibia", "Chicomba", "Chipindo", "Cuvango", "Humpata", "Jamba", "Matala", "Quilengues", "Quipungo"],
    "Icolo e Bengo": ["Catete", "Quiçama", "Calumbo", "Cabiri", "Cabo Ledo", "Bom Jesus", "Sequele"],
    "Luanda": ["Luanda", "Belas", "Cacuaco", "Cazenga", "Kilamba Kiaxi", "Talatona", "Viana"],
    "Lunda Norte": ["Dundo", "Caungula", "Cambulo", "Capenda-Camulemba", "Cuango", "Cuílo", "Lóvua", "Lubalo", "Lucapa", "Xá-Muteba"],
    "Lunda Sul": ["Saurimo", "Cacolo", "Dala", "Muconda"],
    "Malanje": ["Malanje", "Cacuso", "Calandula", "Cambundi-Catembo", "Cangandala", "Caombo", "Cuaba Nzogo", "Cunda-Dia-Baze", "Luquembo", "Marimba", "Massango", "Mucari", "Quela", "Quirima"],
    "Moxico": ["Luena", "Camanongue", "Léua", "Cameia", "Kamanongue"],
    "Moxico Leste": ["Cazombo", "Alto Zambeze", "Bundas", "Luau", "Luacano", "Luchazes", "Lumbala N'guimbo"],
    "Namibe": ["Moçâmedes", "Tômbwa", "Bibala", "Camucuio", "Virei"],
    "Uíge": ["Uíge", "Ambuila", "Bembe", "Buengas", "Bungo", "Cangola", "Damba", "Maquela do Zombo", "Milunga", "Mucaba", "Negage", "Puri", "Quimbele", "Quitexe", "Sanza Pombo", "Songo"],
    "Zaire": ["Mbanza Congo", "Soyo", "Cuimba", "N'Zeto", "Noqui", "Tomboco"]
}

def seed_db():
    db = SessionLocal()
    try:
        # Limpar os dados antigos para evitar duplicatas ou províncias obsoletas (ex: Cuando Cubango)
        db.query(Municipio).delete()
        db.query(Provincia).delete()
        db.commit()
        print("Tabelas limpas para inserção dos novos dados.")

        for prov_nome, municipios in PROVINCIAS_ANGOLA.items():
            provincia = db.query(Provincia).filter(Provincia.nome == prov_nome).first()
            if not provincia:
                provincia = Provincia(nome=prov_nome)
                db.add(provincia)
                db.commit()
                db.refresh(provincia)
            
            for mun_nome in municipios:
                municipio = db.query(Municipio).filter(Municipio.nome == mun_nome, Municipio.provincia_id == provincia.id).first()
                if not municipio:
                    db.add(Municipio(nome=mun_nome, provincia_id=provincia.id))
        
        db.commit()
        print("Base de dados atualizada com as 21 províncias de Angola!")
    except Exception as e:
        print(f"Erro ao alimentar base de dados: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
