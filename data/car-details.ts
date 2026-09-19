import type { Car } from "@/data/cars";

export interface CarDetailImage {
  src: string;
  alt: string;
}

export type FeatureIconKey = "engine" | "comfort" | "tech";

export interface CarFeatureGroup {
  category: string;
  icon: FeatureIconKey;
  items: string[];
}

export interface CarDetail {
  images: CarDetailImage[];
  editorial: {
    headline: string;
    dek: string;
    paragraphs: string[];
  };
  features: CarFeatureGroup[];
}

const SUPPLEMENT_POOL = [
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1541447271487-09612b3f49f7?auto=format&fit=crop&w=1600&q=80",
];

function galleryFor(
  primary: string,
  offset: number,
  label: string,
): CarDetailImage[] {
  return [
    { src: primary, alt: "Vista frontal de tres cuartos" },
    {
      src: SUPPLEMENT_POOL[offset % 4],
      alt: `Vista exterior adicional del ${label} (1 de 3)`,
    },
    {
      src: SUPPLEMENT_POOL[(offset + 1) % 4],
      alt: `Vista exterior adicional del ${label} (2 de 3)`,
    },
    {
      src: SUPPLEMENT_POOL[(offset + 2) % 4],
      alt: `Vista exterior adicional del ${label} (3 de 3)`,
    },
  ];
}

export const carDetails: Record<string, CarDetail> = {
  "range-rover-sport-2023": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=80",
      0,
      "Land Rover Range Rover Sport",
    ),
    editorial: {
      headline: "Domina Cualquier Terreno Sin Que Se Te Acelere el Pulso",
      dek: "El Range Rover Sport Autobiography combina la serenidad del off-road con una auténtica urgencia sobre el asfalto: un equilibrio tan poco común como deliberado.",
      paragraphs: [
        "Hay un tipo particular de silencio que solo se logra cuando el exceso de ingeniería se envuelve en contención. Al volante del Range Rover Sport Autobiography, ese silencio llega de inmediato: el ruido de la cabina queda sofocado por los vidrios acústicos, y las imperfecciones del camino se disuelven gracias a una suspensión neumática adaptativa que lee la superficie una fracción de segundo antes de que lo hagan las ruedas.",
        "Debajo de esa compostura hay capacidad real. El sistema Terrain Response 2 redistribuye automáticamente potencia y amortiguación entre barro, arena y roca, mientras el seis cilindros en línea biturbo entrega el torque necesario para sobrepasar sin esfuerzo y sin sonar nunca forzado. Es un vehículo pensado para manejarse con firmeza tanto a la salida del colegio como, con más firmeza todavía, por un camino de tierra.",
        "Por dentro, la pintura Santorini Black da paso a una cabina revestida en cuero acolchado y madera de poro abierto: detalles que premian una segunda mirada en lugar de anunciarse a los gritos. Es un lujo que se mide en contención, no en volumen.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "Seis cilindros en línea biturbo 3.0L, 395 hp",
          "Transmisión automática de 8 velocidades",
          "Sistema todoterreno Terrain Response 2",
          "Suspensión neumática adaptativa con respuesta dinámica",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Asientos de cuero acolchado con calefacción y ventilación",
          "Techo corredizo panorámico de vidrio",
          "Climatizador de cuatro zonas",
          "Iluminación ambiental configurable, 30 colores",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Pantalla táctil Pivi Pro de 13,1 pulgadas",
          "Cámara de 360 grados con visión de suelo ClearSight",
          "Control de crucero adaptativo con asistente de mantenimiento de carril",
          "Sensor de vadeo para cruces de agua de hasta 900 mm",
        ],
      },
    ],
  },
  "bmw-m5-2023": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=80",
      1,
      "BMW M5",
    ),
    editorial: {
      headline: "El Sedán Ejecutivo Que Miente Sobre Su Trabajo Diario",
      dek: "Cuatro puertas, un asiento trasero y 617 caballos de fuerza conspirando para que cada viaje al trabajo se sienta como un desafío.",
      paragraphs: [
        "El M5 Competition siempre le jugó una broma a quien lo mira: una silueta de sedán que esconde un chasis afinado por gente que claramente quería construir un superdeportivo y se conformó con la practicidad como concesión. La pintura Brooklyn Grey no hace más que perfeccionar el disfraz.",
        "La potencia del V8 biturbo se canaliza a través de una automática de ocho velocidades y un sistema de tracción integral que, con solo apretar un botón, puede enviar toda la fuerza únicamente a las ruedas traseras. Es un margen de desempeño inusualmente honesto: sereno a nueve décimos de su capacidad, y genuinamente salvaje cuando se exige el resto.",
        "Por dentro, los asientos M con respaldo de fibra de carbono te sostienen como debe hacerlo un verdadero deportivo, y la sobriedad de la cabina —metal real, costuras reales, sin adornos innecesarios— deja en claro que esto es, antes que nada, una herramienta para conducir, y recién después una declaración de lujo.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "V8 biturbo 4.4L, 617 hp",
          "Automática M Steptronic de 8 velocidades",
          "Tracción integral M xDrive con modo 2WD",
          "Suspensión adaptativa M",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Asientos deportivos M con respaldo de fibra de carbono, calefaccionados y ventilados",
          "Tapizado en cuero Merino",
          "Sonido envolvente Bowers & Wilkins Diamond",
          "Modos de manejo configurables con memoria",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Pantalla curva BMW Curved Display de 12,3 pulgadas",
          "Pantalla head-up",
          "Analizador de derrape M y cronómetro de vueltas",
          "Alerta activa de punto ciego y de salida de carril",
        ],
      },
    ],
  },
  "porsche-panamera-2024": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
      2,
      "Porsche Panamera",
    ),
    editorial: {
      headline: "Ingeniería de Precisión, Vestida Para Cualquier Ocasión",
      dek: "El Panamera 4S demuestra que un gran turismo y un deportivo nunca debieron ser vehículos distintos.",
      paragraphs: [
        "Porsche construyó el Panamera para responder una pregunta que nadie creía que tuviera una buena respuesta: ¿podía un cuatro puertas con espacio trasero real seguir sintiéndose como un 911 cuando el camino se ponía interesante? El 4S responde con un V6 biturbo y una suspensión neumática calibrada con auténtica vocación deportiva.",
        "La pintura exterior Carrara White mantiene visible la tensión del diseño —el capot alargado, la línea de techo fastback, los anchos guardabarros traseros— mientras el sistema Porsche Active Suspension Management endurece o suaviza la marcha en silencio, adaptándose al humor del conductor más que al del camino.",
        "Al subir, la cabina se lee como un cockpit: un tacómetro analógico al centro, rodeado de pantallas digitales que nunca se sienten como una concesión. Cada superficie está terminada con la consistencia que solo logra un fabricante que lleva décadas construyendo interiores de esta manera.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "V6 biturbo 2.9L, 440 hp",
          "Transmisión de doble embrague PDK de 8 velocidades",
          "Porsche Active Suspension Management",
          "Tracción integral con dirección en el eje trasero",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Asientos deportivos adaptativos eléctricos con 14 ajustes",
          "Climatizador de cuatro zonas",
          "Sistema de sonido envolvente Bose",
          "Techo panorámico fijo de vidrio",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Sistema Porsche Communication Management de 12,3 pulgadas",
          "Control de crucero adaptativo Porsche InnoDrive",
          "Asistente de visión nocturna",
          "Integración inalámbrica con Apple CarPlay",
        ],
      },
    ],
  },
  "tesla-roadster-2024": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=80",
      3,
      "Tesla Roadster",
    ),
    editorial: {
      headline: "El Futuro de la Velocidad Ya Llegó",
      dek: "Cero emisiones, cero concesiones: el Roadster Founders Series redefine lo que puede ser un hiperauto.",
      paragraphs: [
        "Los números rara vez cuentan toda la historia, pero los del Roadster hablan bastante por sí solos: una aceleración de 0 a 60 mph en menos de dos segundos, una velocidad máxima que supera las 250 mph y una autonomía de 620 millas que hace que la idea de un hiperauto eléctrico se sienta menos como una novedad y más como algo inevitable.",
        "La pintura Red Multi-Coat sobre una carrocería de fibra de carbono mantiene el peso bajo y la presencia alta. No hay sonido de motor que anuncie las intenciones del auto: solo un empuje silencioso e inmediato que redefine la noción misma de lo que se siente acelerar.",
        "La cabina de la Founders Series es deliberadamente minimalista: cuatro asientos, un techo de vidrio y un panel removible para una experiencia a cielo abierto genuina. Es un hiperauto que invita a dejar de pensar en cómo debería sonar un hiperauto, y a empezar a pensar en cómo debería sentirse.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "Tren motriz eléctrico de tres motores con tracción integral",
          "0 a 60 mph en menos de 2 segundos",
          "Autonomía estimada de 620 millas",
          "Panel de techo de vidrio removible inspirado en SpaceX",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Cabina de fibra de carbono para 4 pasajeros",
          "Asientos deportivos calefaccionados y ventilados",
          "Audio premium con cancelación activa de ruido",
          "Techo panorámico de vidrio",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Pantalla táctil central de 17 pulgadas",
          "Actualizaciones de software por aire (OTA)",
          "Asistencia avanzada al conductor Autopilot",
          "Pantalla de telemetría en Modo Pista",
        ],
      },
    ],
  },
  "honda-crv-2022": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1600&q=80",
      0,
      "Honda CR-V",
    ),
    editorial: {
      headline: "La Confianza Silenciosa de Hacer Todo Bien",
      dek: "Sin drama, sin concesiones: el CR-V Touring Hybrid está diseñado para la vida que realmente llevas.",
      paragraphs: [
        "No todos los vehículos necesitan anunciarse a los gritos. El CR-V Touring Hybrid se gana su lugar a través de la consistencia: un sistema híbrido que entrega una eficiencia excepcional sin pedirte que pienses en él, y una cabina construida en torno a una utilidad genuina, sin pretensiones.",
        "La pintura Platinum White Pearl le sienta bien a un diseño que valora la proporción por sobre el brillo. Por dentro, el sistema híbrido de dos motores de Honda combina un motor 2.0L con motores eléctricos para una entrega de potencia suave y silenciosa, que casi nunca delata la transición entre la nafta y la asistencia eléctrica.",
        "Es un vehículo construido por gente que entiende que la mayor parte de la conducción ocurre en momentos ordinarios —llevar a los chicos al colegio, ir de compras, largos tramos de ruta— y que decidió que esos momentos también merecían un esfuerzo de ingeniería real.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "Sistema híbrido de 4 cilindros 2.0L, 204 hp combinados",
          "Transmisión automática e-CVT",
          "Tracción integral en tiempo real",
          "Hasta 40 MPG combinados",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Asientos delanteros y traseros de cuero calefaccionados",
          "Portón trasero eléctrico con acceso manos libres",
          "Climatizador automático de dos zonas",
          "Techo solar panorámico",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Pantalla táctil de 9 pulgadas con Apple CarPlay inalámbrico",
          "Paquete de seguridad Honda Sensing",
          "Cargador de celular inalámbrico",
          "Pantalla head-up",
        ],
      },
    ],
  },
  "nissan-gtr-2023": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80",
      1,
      "Nissan GT-R",
    ),
    editorial: {
      headline: "Godzilla, Todavía Invicto",
      dek: "Dos décadas de refinamiento incesante no hicieron más que afilar el propósito único del GT-R: velocidad sin pedir disculpas.",
      paragraphs: [
        "El GT-R nunca corrió detrás de las tendencias. Su V6 biturbo armado a mano y su sistema de tracción integral ATTESA E-TS existen por una sola razón: poner cada uno de sus 565 caballos de fuerza sobre el asfalto con una violencia que se siente casi mecánica en su precisión.",
        "La pintura Pearl White sobre la ya conocida silueta ensanchada anuncia con honestidad las intenciones del auto: esta es una máquina construida alrededor de un tiempo de vuelta en Nürburgring, no de un panel de ideas en una sala de reuniones. La transmisión de doble embrague cambia de marcha con una contundencia física que rara vez ofrecen las cajas automáticas convencionales.",
        "La cabina se fue refinando con los años —mejores materiales, un tablero más limpio— pero la posición de manejo y el sonido de ese motor siguen siendo inconfundible y desafiantemente GT-R. Algunos autos evolucionan suavizándose. Este evoluciona volviéndose cada vez mejor en hacer exactamente lo que siempre hizo.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "V6 biturbo 3.8L, 565 hp",
          "Transmisión de doble embrague de 6 velocidades",
          "Tracción integral ATTESA E-TS",
          "Control de largada con 0 a 60 mph en 2,9 s",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Asientos deportivos de cuero semianilina",
          "Asientos delanteros calefaccionados",
          "Sistema de audio premium Bose",
          "Climatizador automático de dos zonas",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Pantalla táctil multifunción de 8 pulgadas",
          "Navegación Nissan con registrador de datos de performance GT-R",
          "Cámara de retroceso con sensores de estacionamiento",
          "Bluetooth manos libres con audio en streaming",
        ],
      },
    ],
  },
  "ford-expedition-2023": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=80",
      2,
      "Ford Expedition",
    ),
    editorial: {
      headline: "Lugar Para Todos, Sin Ceder un Centímetro de Capacidad",
      dek: "La Expedition Platinum demuestra que ser de tamaño completo no tiene por qué significar concesiones completas.",
      paragraphs: [
        "Tres filas de espacio genuinamente aprovechable, un V6 biturbo que remolca con autoridad y una calidad de marcha suavizada por suspensión adaptativa: la Expedition Platinum fue construida para familias que también esperan que su vehículo se gane el sustento.",
        "La pintura Agate Black le da a las imponentes proporciones de la Expedition un aire de ocasión especial, mientras que la suspensión trasera independiente —poco habitual en el segmento— hace que la tercera fila sea realmente habitable en viajes largos, y no un simple agregado.",
        "Por dentro, la versión Platinum aporta cuero acolchado, detalles en madera real y una pantalla táctil de 12 pulgadas que hacen que la cabina se sienta más cerca de un sedán insignia que de una camioneta tradicional sobre chasis independiente. Logra el infrecuente truco de sentirse robusta y genuinamente sofisticada al mismo tiempo.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "V6 EcoBoost biturbo 3.5L, 440 hp",
          "Transmisión automática de 10 velocidades",
          "Suspensión trasera independiente",
          "Capacidad de remolque de hasta 9.300 lbs",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Asientos de cuero acolchado con calefacción y ventilación",
          "Tercera fila plegable eléctrica",
          "Techo panorámico vista",
          "Asientos delanteros con masaje",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Pantalla táctil SYNC 4 de 12 pulgadas",
          "Asistente de reversa para acoplados Pro Trailer Backup Assist",
          "Sistema de cámara de 360 grados",
          "Control de crucero adaptativo con función stop-and-go",
        ],
      },
    ],
  },
  "mercedes-amg-gtr-2023": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=80",
      3,
      "Mercedes-AMG GT R",
    ),
    editorial: {
      headline: "Construido en la Pista, Refinado Para la Ruta",
      dek: "El GT R Pro se afinó en Nürburgring mucho antes de afinarse para el confort, y se nota.",
      paragraphs: [
        "La pintura Green Hell Magno no es tanto una elección de color como una declaración de origen: nombrada en honor al apodo del Nürburgring, «el Infierno Verde», marca a un auto cuya geometría de suspensión, paquete aerodinámico y jaula antivuelco fueron moldeados por tiempos de vuelta, y no por el atractivo de un showroom.",
        "El V8 biturbo armado a mano envía la potencia a través de un transeje montado en la parte trasera para lograr una distribución de peso casi perfecta, mientras que un sistema activo de dirección en las ruedas traseras agudiza el ingreso en curva a alta velocidad y estabiliza el auto a baja velocidad de una manera que se siente casi injusta.",
        "AMG no suavizó el paquete Pro para hacerlo más vivible: simplemente se aseguró de que las dos cosas que mejor hace, ir rápido y frenar rápido, nunca tuvieran que ceder terreno frente a nada más. Esto es ingeniería de pista con chapa patente.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "V8 biturbo 4.0L, 577 hp",
          "Transmisión AMG SPEEDSHIFT DCT de 7 velocidades",
          "Dirección activa en las ruedas traseras",
          "Suspensión ajustable tipo coilover",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Asientos deportivos AMG de fibra de carbono",
          "Tapizado en cuero Nappa y DINAMICA",
          "Sistema de sonido envolvente Burmester",
          "Paquete de terminaciones en fibra de carbono",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Telemetría AMG Track Pace",
          "Tablero digital de 12,3 pulgadas",
          "Programas de manejo AMG Dynamic Select",
          "Cámara de retroceso con guía de estacionamiento",
        ],
      },
    ],
  },
  "lamborghini-aventador-2023": {
    images: galleryFor(
      "https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?auto=format&fit=crop&w=1600&q=80",
      0,
      "Lamborghini Aventador",
    ),
    editorial: {
      headline: "El Último de una Era, y lo Grita a los Cuatro Vientos",
      dek: "El Aventador SVJ, con su V12 atmosférico, es una carta de despedida escrita a 8.700 RPM.",
      paragraphs: [
        "No hay nada sutil en el Aventador SVJ, y no tiene ningún interés en serlo. Pintura Arancio Xanto, un V12 atmosférico que gira hasta las 8.700 RPM y un sistema de aerodinámica activa que se reconfigura visiblemente en curvas exigentes: este es un auto construido enteramente sin concesiones.",
        "El sistema de aerodinámica activa ALA 2.0 hace pasar el aire a través de la carrocería para generar carga aerodinámica exactamente donde y cuando se necesita, un sistema tan eficaz que el SVJ llegó a ostentar el récord de vuelta para autos de producción en Nürburgring. Es tecnología de automovilismo deportivo con chapa patente.",
        "Por dentro, la cabina está enfocada en el conductor sin pedir disculpas por ello: un botón de arranque bajo una tapa roja al estilo caza de combate, un tablero dominado por la fibra de carbono y casi nada que distraiga del rugido del motor que llena la cabina detrás de ti. Algunos autos son transporte. Este es un acontecimiento.",
      ],
    },
    features: [
      {
        category: "Rendimiento y Motor",
        icon: "engine",
        items: [
          "V12 atmosférico 6.5L, 759 hp",
          "Transmisión manual automatizada ISR de 7 velocidades",
          "Aerodinámica activa ALA 2.0",
          "0 a 60 mph en 2,8 segundos",
        ],
      },
      {
        category: "Lujo y Confort",
        icon: "comfort",
        items: [
          "Asientos de competición de fibra de carbono",
          "Tapizado en Alcantara y cuero",
          "Climatizador de dos zonas",
          "Sistema de elevación para situaciones de poca altura libre",
        ],
      },
      {
        category: "Tecnología y Seguridad",
        icon: "tech",
        items: [
          "Sistema de infoentretenimiento con pantalla táctil de 8,4 pulgadas",
          "Cámara de retroceso con sensores de estacionamiento",
          "Sistema de telemetría Lamborghini",
          "Selector de modos de manejo (Strada, Sport, Corsa, Ego)",
        ],
      },
    ],
  },
};

export function buildFallbackDetail(car: Car): CarDetail {
  return {
    images: [{ src: car.image, alt: `${car.year} ${car.make} ${car.model} ${car.trim}` }],
    editorial: { headline: "", dek: "", paragraphs: [] },
    features: [],
  };
}
