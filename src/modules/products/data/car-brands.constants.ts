/**
 * Car brands and their models, transcribed from the `car_brands_and_models`
 * section of the product spec (Onboarding Screens, pp. 24-65).
 *
 * 117 brands, 1457 models. Every brand ends with its own `Andre` ("Other")
 * entry, which is the escape hatch for a model the spec does not list.
 *
 * Order and spelling follow the spec exactly - do not "correct" entries here,
 * because stored listings match on these strings.
 */
export const CAR_BRANDS = {
    'Abarth': ['124 Spider', '500', '595', '695'],
    'ACE': ['Andre'],
    'AC': ['Cobra', 'Matador'],
    'Addax': ['MT', 'MTN'],
    'Alfa Romeo': [
        '145', '147', '155', '156', '159', '164', '166', '33', '4C', '75', '90', 'Alfasud',
        'Alfetta', 'Brera', 'GT', 'GTV', 'Giulia Quadrifoglio', 'Giulietta',
        'Giulietta (gml. type)', 'MiTo', 'Spider', 'Sprint', 'Stelvio', 'Stelvio Quadrifoglio',
        'Tonale', 'Andre'
    ],
    'Alpina': [
        'A110', 'B10', 'B12', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'D10', 'D3', 'D4', 'D5',
        'Roadster S', 'XD3'
    ],
    'AMC': ['Andre'],
    'Ariel': ['Atom'],
    'Aston Martin': [
        'Cygnet', 'DB7', 'DB9', 'DB11', 'DB11 Volante', 'DBS Superleggera', 'DBX', 'Rapide',
        'V12 Vantage', 'V8 Vantage', 'Vanquish', 'Virage', 'Andre'
    ],
    'Audi': [
        'A1', 'A2', 'A3', 'A4', 'A4 allroad', 'A5', 'A6', 'A6 allroad', 'A7', 'A8', 'Q2', 'Q3',
        'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'Q8 e-tron', 'R8', 'RS2', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7',
        'RSQ3', 'RSQ8', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'SQ5', 'SQ7', 'SQ8', 'TT',
        'V8', 'e-tron', 'e-tron GT RS', 'e-tron GT', 'e-tron Sportback', '50', '60', '80', '90',
        '100', '200', 'Andre'
    ],
    'Austin': ['Healey 100 6', 'Healey 3000', 'Princess', 'Andre'],
    'BMW': [
        '1-serie', '1M', '2-serie', '3-serie', '4-serie', '5-serie', '6-serie', '7-serie',
        '8-serie', '3-serie GT', '5-serie GT', 'M2', 'M3', 'M4', 'M5', 'M6', 'X1', 'X2', 'X3',
        'X3 M', 'X4', 'X4 M', 'X5', 'X5 M', 'X6', 'X6 M', 'X7', 'XM', 'M8', 'Z1', 'Z3', 'Z4', 'Z8',
        'i3', 'i4', 'i4 M50', 'i5', 'i5 M60', 'i7', 'i8', 'iX1', 'iX3', 'iX40', 'iX M60',
        'iX xDrive 40', 'iX xDrive 40', 'iX xDrive M60', '1500', '1600', '1602', '1800', '2000',
        '2002', '2500', '2800', 'Andre'
    ],
    'Bentley': [
        'Arnage', 'Bentayga', 'Continental GT', 'Continental GTC', 'Flying Spur', 'Mulsanne',
        'Andre'
    ],
    'Buddy': [
        'Basic', 'Citi-Jet 6', 'Classic Basis', 'Classic Cab', 'Classic Pluss', 'Pluss', 'Premium'
    ],
    'Buick': ['Centurion', 'Century', 'Le Sabre', 'Park Avenue', 'Regal', 'Skylark'],
    'Bugatti': ['Chiron', 'Andre'],
    'BYD': ['Atto3', 'Han', 'T3', 'Tang', 'Andre'],
    'Cadillac': [
        'ATS', 'BLS', 'CTS', 'Deville', 'Eldorado', 'Elr', 'Escalade', 'Fleetwood', 'SRX',
        'Seville', 'XLR', 'Andre'
    ],
    'Chevrolet': [
        'Alero', 'Astro', 'Avalanche', 'Aveo', 'Beauville', 'Bel Air', 'Beretta', 'Big Dooley',
        'Blazer', 'Bolt', 'C-10', 'Camaro', 'Caprice', 'Captiva', 'Cargovan', 'Chevelle',
        'Cheyenne', 'Colorado', 'Corsica', 'Corvair', 'Corvette', 'Crew Cab', 'Cruze', 'El Camino',
        'Epica', 'Express', 'Extended Cab', 'Impala', 'Kalos', 'Korea', 'Lacetti', 'Lumina',
        'Malibu', 'Master', 'Matiz', 'Monte Carlo', 'Nubira', 'Orlando', 'Regular Cab', 'S-10',
        'Silverado', 'Spark', 'Sport Van', 'Starcraft', 'Suburban', 'Tahoe', 'Trailblazer',
        'Trans Sport', 'Trax', 'Van', 'Volt'
    ],
    'Chrysler': [
        '300 M', '300C', 'Crossfire', 'Grand Voyager', 'Le Baron', 'Neon', 'New Yorker',
        'PT Cruiser', 'Pacifica', 'Plymouth Premier', 'Plymouth Volare', 'Prowler', 'Sebring',
        'Stratus', 'Vision', 'Voyager', 'Andre'
    ],
    'Citroën': [
        '2CV', 'AX', 'BX', 'Berlingo', 'Berlingo Electrique', 'C-Crosser', 'C-Zero', 'C1', 'C2',
        'C3', 'C3 Aircross', 'C3 Picasso', 'C4', 'C4 Aircross', 'C4 Cactus', 'C4 Picasso', 'C5',
        'C5 Aircross', 'C5 X', 'C6', 'C8', 'CX', 'DS3', 'DS4', 'DS5', 'E-C4', 'E-C4 X', 'E-Mehari',
        'Evasion', 'GSA', 'Grand C4 Picasso', 'Grand C4 Spacetourer', 'Jumper', 'Jumpy', 'Nemo',
        'SAXO Electrique', 'Saxo', 'Space Tourer', 'Visa', 'XM', 'Xantia', 'Xsara', 'Xsara Picasso',
        'ZX'
    ],
    'Cupra': ['Formentor', 'Formentor e-HYBRID', 'Leon e-Racer', 'Born'],
    'DAF': ['Andre'],
    'DS': ['DS 3', '3 Crossback', 'DS 4', 'DS 5', 'DS 7 Crossback', 'DS 9'],
    'Dacia': ['Duster', 'Logan', 'Dokker', 'Andre'],
    'Daewoo': [
        'Espero', 'Kalos', 'Koranda', 'Lacetti', 'Lanos', 'Leganza', 'Matiz', 'Musso', 'Nexia',
        'Nubira', 'Tacuma', 'Andre'
    ],
    'Daihatsu': [
        'Applause', 'Charade', 'Copen', 'Cuore', 'Gran Move', 'Rocky', 'Sirion', 'Terios', 'YRV',
        'Andre'
    ],
    'Datsun': ['Datsun', 'Andre'],
    'Detomaso': ['Pantera', 'Andre'],
    'Delorean': ['DMC-12', 'Andre'],
    'Dodge': [
        'Avenger', 'Caliber', 'Challenger', 'Charger', 'Dakota', 'Durango', 'Grand Caravan',
        'Journey', 'Le Baron', 'Magnum', 'Nitro', 'RAM', 'RAM STR-10', 'Viper', 'Andre'
    ],
    'Ferrari': [
        '296', '308', '328', '348', '355', '360', '365', '412', '430', '456', '458 Italia',
        '458 Spider', '488 GTB', '488 Spider', '488 Pista', '512', '550 Maranello', '575 Maranello',
        '599', '612', '812 GTS', '812 Superfast', 'California', 'Dino', 'F8 Spider', 'F8 Tributo',
        'F 40', 'F12 Berlinetta', 'FF', 'GTC4Lusso', 'Mondial', 'Portofino', 'Roma', 'SF90 Spider',
        'SF90 Stradale', 'Testarossa', 'Andre'
    ],
    'Fiat': [
        '124 Spider', '500', '500L', '500X', 'Barchetta', 'Bertone', 'Brava', 'Bravo', 'Coupe',
        'Croma', 'Doblo', 'Ducato', 'Freemont', 'Fullback', 'Grande Punto', 'Marea', 'Multipla',
        'Panda', 'Punto', 'Punto Evo', 'Regata', 'Ritmo', 'Scudo', 'Sedici', 'Stilo', 'Starda',
        'Talento', 'Tipo', 'Ulysse', 'Uno', 'X 1/9', 'Andre'
    ],
    'Fisker': ['Karma', 'Karma S', 'Ocean', 'Andre'],
    'Ford': [
        'Aerostar', 'B-MAX', 'Bronco', 'C-Max', 'Cougar', 'Courier', 'Custom Line', 'Econoline',
        'Ecosport', 'Edge', 'Escort', 'Excursion', 'Expedition', 'Explorer', 'Extended Cab',
        'F-serie', 'Fiesta', 'Focus', 'Focus CC', 'Fusion', 'Galaxy', 'Granada', 'Grand C-MAX',
        'Grand Tourneo Connect', 'Ka', 'Ka+', 'Kuga', 'Maverick', 'Mondeo', 'Mustang',
        'Mustang Mach-E', 'Orion', 'Probe', 'Puma', 'Ranger', 'S-MAX', 'SVT Lightning', 'Scorpio',
        'Sirra', 'Sportka', 'StreetKa', 'Taunus', 'Taurus', 'Thunderbird', 'Tourneo Connect',
        'Tourneo Courier', 'Tourneo Custom', 'Transit', 'Transit Connect', 'Transit Courier',
        'Transit Custom', 'Van', 'Windstar', 'Andre'
    ],
    'GMC': [
        'Crew Cab', 'Envoy', 'Extended Cab', 'Sierra', 'Silverado', 'Syclone', 'Yukon', 'Andre'
    ],
    'Goupil': ['G2', 'G4', 'G5', 'G6', 'Andre'],
    'Hiphi': ['X', 'Z', 'Y', 'Andre'],
    'Honda': [
        'Accord', 'CR-V', 'CR-Z', 'CRX', 'Civic', 'e', 'e:Ny1', 'Element', 'FR-V', 'HR-V',
        'Insight', 'Integra', 'Jazz', 'Legend', 'Nsx', 'Odyssey', 'Prelude', 'Quintet', 'Ridgeline',
        'S2000', 'Shuttle', 'Stream', 'Andre'
    ],
    'Hongqi': ['E-HS9', 'Andre'],
    'Hummer': ['H1', 'H2', 'H3', 'HX', 'Andre'],
    'Hyundai': [
        'Accent', 'Atos', 'Coupe', 'Elantra', 'Galloper', 'Getz', 'Grand Santa Fe', 'H-1', 'H-100',
        'IONIQ', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Matrix', 'Nexo', 'Pony', 'Santa Fe', 'Sonata',
        'Terracan', 'Trajet', 'Tucson', 'Veloster', 'X35', 'XG', 'i10', 'i20', 'i30', 'i40', 'ix20',
        'ix35', 'ix55', 'Andre'
    ],
    'Infiniti': [
        'FX30D', 'FX35', 'FX37', 'FX45', 'FX50', 'G35', 'G37', 'M35', 'M45', 'Q30', 'Q50 Hybrid',
        'QX56', 'Andre'
    ],
    'Isuzu': ['D-max', 'Trooper', 'Andre'],
    'Iveco': ['3510', 'Daily', 'Andre'],
    'JAC': ['e-JS4', 'Andre'],
    'Jaguar': [
        'E-PACE', 'E-TYPE', 'F-PACE', 'F-TYPE', 'I-PACE', 'S-TYPE', 'X-TYPE', 'XE', 'XF', 'XJ',
        'XJR', 'XJS', 'XK', 'Andre'
    ],
    'Jeep': [
        'Avenger', 'Cherokee', 'Comanche', 'Commander', 'Compass', 'Grand Cherokee', 'J 20',
        'Patriot', 'Renegade', 'Wrangler', 'Gladiator', 'Andre'
    ],
    'Jensen': ['Interceptor', 'Andre'],
    'Kewet': ['Buddy', 'City-Jet 5', 'El-Jet', 'Andre'],
    'Kia': [
        'Besta', 'Carens', 'Carnival', 'Cee\'d', 'Cerato', 'Clarus', 'Credos', 'E-Niro', 'EV6',
        'Magentis', 'Niro', 'Optima', 'Picanto', 'Pregio', 'Pride', 'ProCeed', 'Rio', 'Sephia',
        'Shuma', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Stonic', 'Venga', 'XCeed', 'Andre'
    ],
    'Koenigsegg': ['CCR', 'Andre'],
    'Lada': ['1200', '1300', '1500', '1600', 'Niva', 'Samara', 'Andre'],
    'Lamborghini': [
        'Aventador', 'Countach', 'Diablo', 'Gallardo', 'Huracan', 'Huracan Spyder', 'LM',
        'Murcielago', 'Urus', 'Andre'
    ],
    'Lancia': [
        'A112', 'Delta', 'Kappa', 'Lybra', 'Musa', 'Phedra', 'Prisma', 'Thema', 'Thesis', 'Y10',
        'Ypsilon', 'Andre'
    ],
    'Lucid': ['Air', 'Andre'],
    'Land Rover': [
        'Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover',
        'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar', 'Andre'
    ],
    'Lexus': [
        'CT200h', 'ES', 'GS', 'IS', 'LC', 'LS', 'NX 300h', 'NX 450h', 'RC', 'RC300h', 'RZ', 'RX300',
        'RX400h', 'RX450h', 'SC', 'UX', 'RX500h', 'Andre'
    ],
    'Lincoln': ['Navigator', 'Town Car', 'Andre'],
    'Lotus': ['Elise', 'Europa S', 'Eletre', 'Evora', 'Exige', 'Seven', 'Andre'],
    'MAN': ['TGE', 'eTGE', 'Andre'],
    'Mia Electric': ['mia', 'mia L', 'mia U'],
    'MG': [
        'MG4', 'MG5', 'MG-F', 'EHS', 'MGB', 'Marvel R', 'TF', 'ZS', 'ZS EV', 'mia', 'ZT', 'Andre'
    ],
    'Mini': [
        'Cabrio', 'Clubman', 'Cooper', 'Cooper S', 'Cooper SE', 'Countryman', 'Coupe', 'One',
        'Paceman', 'Roadster', 'Andre'
    ],
    'Maserati': [
        '222', '3200', '3500', 'Biturbo', 'Coupe', 'Ghibli', 'Gran Turismo', 'Indy', 'Levante',
        'MC20', 'Mistral', 'Quattroporte', 'Quattroporte Evoluzzione', 'Spyder', 'GranCabrio',
        'Grecale', 'Andre'
    ],
    'Matra': ['Bagheera', 'Murena', 'Andre'],
    'Maxus': [
        'ev80', 'e-Deliver 3', 'e-Deliver 9', 'Euniq MPV', 'Euniq 5', 'Euniq 6', 'T90 EV', 'MIFA 9',
        'Andre'
    ],
    'Maybach': ['57'],
    'Mazda': [
        '121', '2', '3', '323', '5', '6', '626', '929', 'B 2500 Freestyle Cab', 'B2000', 'B2200',
        'B2600', 'BT-50', 'CX-3', 'CX-5', 'CX-7', 'CX-30', 'CX-60', 'Demio', 'E2000', 'MPV', 'MX-3',
        'MX-30', 'MX-5', 'Premacy', 'RX-2', 'RX-7', 'RX-8', 'Tribute', 'Xedos', 'Andre'
    ],
    'McLaren': ['12C', '570GT', '570S', '675LT', '720S', '765LT', 'Artura', 'Andre'],
    'Mercedes-Benz': [
        '190', 'A-klasse', 'AMG GT', 'AMG GT C', 'AMG GT R', 'AMG GT S', 'B-Klasse', 'C-Klasse',
        'C-Klasse All-Terrain', 'CL', 'CLA', 'CLC', 'CLK', 'CLS', 'Citan', 'eCitan', 'E-Klasse',
        'E-Klasse All-Terrain', 'EQC', 'EQS', 'EQB', 'EQE', 'EQE SUV', 'EQV', 'EQA', 'EQS SUV',
        'GL', 'GLA', 'GLB', 'GLC', 'GLE', 'GLK', 'GLS', 'Geländewagen', 'M-Klasse', 'R-Klasse',
        'S-Klasse', 'SL', 'SLC', 'SLK', 'SLR', 'SLS', 'Sprinter', 'V-Klasse', 'Vaneo', 'Viano',
        'Vito', 'X-Klasse', 'Andre'
    ],
    'Mercury': ['Andre'],
    'Mitsubishi': [
        '3000 gt', 'ASX', 'Carisma', 'Colt', 'Eclipse', 'Eclipse Cross', 'Galant', 'Grandis',
        'L200', 'L300', 'L400', 'Lancer', 'Outlander', 'Pajero', 'Pajero Pinin', 'Pajero Sport',
        'Sapporo', 'Sigma', 'Space Gear', 'Space Runner', 'Space Star', 'Space Star l',
        'Space Wagon', 'i-Miev', 'Andre'
    ],
    'Morgan': ['3-wheeler', '4/4', 'Aero 8', 'Plus 4', 'Plus 8', 'Roadster', 'Andre'],
    'Morris': ['Mini', 'Andre'],
    'Nio': ['ES8', 'EL7', 'ET7', 'ET5'],
    'Nissan': [
        '100 NX', '200 SX', '300 ZX', '370z', 'Almera', 'Ariya', 'Bluebird', 'Cherry', 'Cube',
        'GT-R', 'Interstar', 'Juke', 'King Cab', 'King Van', 'Kubistar', 'Laurel', 'Leaf', 'Maxima',
        'Micra', 'Murano', 'NP300', 'NV200', 'NV250', 'NV300', 'NV400', 'Navara', 'Note',
        'Pathfinder', 'Patrol', 'Pixo', 'Prairie', 'Primastar', 'Primera', 'Pulsar', 'Qashqai',
        'Qashqai +2', 'Serena', 'Skyline', 'Stanza', 'Sunny', 'Terrano', 'Tino', 'Townstar',
        'X-Trail', 'e-NV200'
    ],
    'Nosmoke': ['Original', 'Truckï', 'Andre'],
    'Oldsmobile': ['Custom', 'Cutlass', 'Delta', 'Omega', 'Andre'],
    'Opel': [
        'ADAM', 'Agila', 'Ampera', 'Antara', 'Ascona', 'Astra', 'Calibra', 'Campo', 'Combo',
        'Commodore', 'Corsa', 'Crossland X', 'Frontera', 'GT', 'Grandland', 'Grandland X',
        'Insignia', 'Insignia Country Tourer', 'Kadett', 'Kapitan', 'Manta', 'Meriva', 'Mokka',
        'Monterey', 'Monza', 'Movano', 'Omega', 'Rekord', 'Senator', 'Signum', 'Sintra',
        'Speedster', 'Tigra', 'Vectra', 'Vivaro', 'Zafira', 'Zafira Tourer', 'Andre'
    ],
    'Packard': ['Clipper', 'Andre'],
    'Panther': ['J72', 'Kallista', 'Lima', 'Andre'],
    'Peugeot': [
        '1007', '106', '106 Electric', '107', '108', '2008', '205', '206', '206 CC', '206 SW',
        '207', '207 CC', '207 SW', '208', '3008', '305', '306', '307', '307 CC', '307 SW', '308',
        '308 SW', '309', '4007', '4008', '405', '406', '407', '408', '5008', '505', '508', '605',
        '607', '806', '807', 'Bipper', 'Boxer', 'Export', 'e-Export', 'Partner', 'Partner Electric',
        'RCZ', 'Rifter', 'Traveller', 'iOn', 'Andre'
    ],
    'Piaggio': ['Porter', 'Porter Maxxi', 'Andre'],
    'Plymouth': ['Grand Voyager', 'Roadrunner', 'Voyager', 'Andre'],
    'Polestar': ['1', '2', 'Andre'],
    'Pontiac': ['Bonneville', 'Fiero', 'Firebird', 'Solstice', 'Trans Am', 'Trans Sport', 'Andre'],
    'Porsche': [
        '356', '911', '914', '924', '928', '944', '968', 'Boxster', 'Carrera GT', 'Cayenne',
        'Cayenne Coupe', 'Cayman', 'Macan', 'Panamera', 'Taycan', 'Taycan Cross Turismo',
        'Taycan Sport Turismo', 'Andre'
    ],
    'Radical': ['RXC', 'SR1', 'SR3', 'SR8', 'Andre'],
    'RAM': ['500', '1500', '2500', '3500', '5500', 'Andre'],
    'Renault': [
        '12', '14', '15', '16', '17', '18', '19', '20', '30', '5', 'Avantime', 'C3', 'Captur',
        'Clio', 'Espace', 'Express', 'Fuego', 'Grand Espace', 'Grand Scenic', 'Kadjar', 'Kangoo',
        'Kangoo Electric', 'Kangoo Express', 'Koleos', 'Laguna', 'Master', 'Megane', 'Megane CC',
        'Modus', 'Scenic', 'Talisman', 'Trafic', 'Twingo', 'Twizy', 'Zeo', 'Andre'
    ],
    'Reva': ['Andre'],
    'Rolls-Royce': ['Cullinan', 'Ghost', 'Phantom', 'Silver Shadow', 'Wraith', 'Andre'],
    'Rover': [
        '200-serie', '400-serie', '600-serie', '800-serie', 'Defender', 'Mini', '25', '45', '75',
        'Andre'
    ],
    'Saab': ['9-3', '9-5', '900', '9000', '99', 'Andre'],
    'Santana': ['PS10', 'Andre'],
    'Scion': ['tC', 'xA', 'xB', 'Andre'],
    'SEAT': [
        'Alhambra', 'Altea', 'Arona', 'Arosa', 'Ateca', 'Cordoba', 'Cordoba Vario', 'Ibiza', 'Inca',
        'Leon', 'Leon XP', 'Mii', 'Tarraco', 'Toledo', 'Andre'
    ],
    'Seres': ['3', '5', 'SF5', 'SF7', 'Andre'],
    'Skoda': [
        'Citigo', 'Enyaq', 'Enyaq Coupe RS', 'Fabia', 'Favorit', 'Felicia', 'Forman', 'Kamiq',
        'Karoq', 'Kodiaq', 'Kodiaq Scout', 'Octavia', 'Octavia RS', 'Octavia Scout', 'Pickup',
        'Rapid', 'Rapid Spaceback', 'Roomster', 'Scala', 'Superb', 'Yeti', 'Andre'
    ],
    'Smart': ['Crossblade', 'Forfour', 'Fortwo', 'Roadster', 'Roadster coupe', 'Andre'],
    'SsangYong': [
        'Actyon Sport', 'Family', 'Korando', 'Kyron', 'Musso', 'Rexton', 'Rexton Sports',
        'Rexton W', 'Rodius', 'Tivoli', 'XLV', 'Andre'
    ],
    'Subaru': [
        'B9 Tribeca', 'BRZ', 'Domingo', 'Forester', 'Impreza', 'Justy', 'L-serie', 'Legacy',
        'Levorg', 'Outback', 'Solterra', 'Trezia', 'XV', 'Andre'
    ],
    'Suzuki': [
        'Alto', 'Across', 'Baleno', 'Grand Vitara', 'Ignis', 'Jimny', 'Kizashi', 'Liana', 'SJ',
        'SX4', 'SX4 S-Cross', 'Splash', 'Swift', 'Vitara', 'Wagon R+', 'XL7', 'Andre'
    ],
    'TVR': ['Andre'],
    'Tazzari': ['Andre', 'Zero'],
    'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Roadster'],
    'Think': ['City', 'Andre'],
    'Toyota': [
        '4-Runner', 'Auris', 'Avensis', 'Avensis Verso', 'Aygo', 'Aygo X', 'bZ4X', 'C-HR', 'Camry',
        'Carina', 'Celica', 'Corolla', 'Corolla Cross', 'Corolla Verso', 'Cressida', 'Crown',
        'Dyna', 'GR Supra', 'GR86', 'GT86', 'HiAce', 'HiClass', 'HiLux', 'Highlander', 'IQ',
        'Lander Cruiser', 'MR2', 'Mirai', 'Picnic', 'Previa', 'Prius', 'Prius Plug-in Hybrid',
        'Prius+ Seven', 'Proace', 'Proace City', 'Proace Verso', 'RAV4', 'Sienna', 'Starlet',
        'Supra', 'Tacoma', 'Tercel', 'Tundra', 'Urban Cruiser', 'Verso', 'Verso-S', 'Yaris',
        'Yaris Cross', 'Yaris Verso', 'GR Yaris', 'Andre'
    ],
    'Triumph': ['Spitfire', 'TR7', 'Andre'],
    'Volkswagen': [
        'Amarok', 'Arteon', 'Beetle', 'Boble (gammel type)', 'Bora', 'Caddy', 'Caddy Alltrack',
        'Caddy Maxi', 'Caravelle', 'Corrado', 'Crafter', 'Derby', 'Eos', 'Golf', 'Golf Alltrack',
        'Golf Cross', 'Golf Plus', 'Golf Sportsvan', 'ID. Buzz', 'ID.3', 'ID.4', 'ID.4 GTX', 'ID.5',
        'ID.5 GTX', 'ID.7', 'Jetta', 'K 70', 'Kombi', 'LT', 'Lupo', 'Multivan', 'Passat',
        'Passat Alltrack', 'Passat CC', 'Phaeton', 'Polo', 'Polo Cross', 'Santana', 'Scirocco',
        'Sharan', 'T-Cross', 'T-Roc', 'Taro', 'Tiguan', 'Tiguan Allspace', 'Touareg', 'Touran',
        'Transporter', 'UP!', 'Variant', 'Vento', 'Andre'
    ],
    'Volvo': [
        '142', '144', '145', '164', '240', '242', '244', '245', '264', '265', '340', '343', '345',
        '360', '440', '460', '480', '744', '740', '745', '760', '780', '850', '940', '960',
        'Amazon', 'C30', 'C40', 'C70', 'Duett', 'P1800', 'PV', 'S40', 'S60', 'S60 Cross Country',
        'S70', 'S80', 'S90', 'V40', 'V40 Cross Country', 'V50', 'V60', 'V60 Cross Country', 'V70',
        'V90', 'V90 Cross Country', 'XC40', 'XC60', 'XC70', 'XC90', 'Andre'
    ],
    'Voyah': ['FREE', 'Andre'],
    'Wiesmann': ['Andre', 'GT MF4', 'GT MF5', 'MF3', 'MF30', 'Roadster MF4', 'Roadster MF5'],
    'XPeng': ['G3', 'G3i', 'G9', 'P5', 'P7', 'Andre'],
    'ZD': ['D1', 'Andre'],
    'Andre': ['Andre'],
} as const;

export type CarBrand = keyof typeof CAR_BRANDS;

export const CAR_BRAND_VALUES = Object.keys(CAR_BRANDS) as CarBrand[];
