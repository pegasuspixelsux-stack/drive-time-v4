export interface Car {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  price: number;
  mileage: number;
  transmission: string;
  fuelType: "Gasoline" | "Hybrid" | "Electric";
  bodyType: "Sedan" | "SUV" | "Coupe";
  color: string;
  colorHex: string;
  image: string;
  features?: string[];
}

export const cars: Car[] = [
  {
    id: "range-rover-sport-2023",
    make: "Land Rover",
    model: "Range Rover Sport",
    trim: "Autobiography",
    year: 2023,
    price: 105700,
    mileage: 6800,
    transmission: "8-Speed Automatic",
    fuelType: "Gasoline",
    bodyType: "SUV",
    color: "Santorini Black",
    colorHex: "#161616",
    image:
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "bmw-m5-2023",
    make: "BMW",
    model: "M5",
    trim: "Competition",
    year: 2023,
    price: 111300,
    mileage: 4100,
    transmission: "8-Speed Automatic",
    fuelType: "Gasoline",
    bodyType: "Sedan",
    color: "Brooklyn Grey",
    colorHex: "#54565c",
    image:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "porsche-panamera-2024",
    make: "Porsche",
    model: "Panamera",
    trim: "4S",
    year: 2024,
    price: 128900,
    mileage: 1500,
    transmission: "8-Speed PDK",
    fuelType: "Gasoline",
    bodyType: "Sedan",
    color: "Carrara White",
    colorHex: "#f2f1ec",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "tesla-roadster-2024",
    make: "Tesla",
    model: "Roadster",
    trim: "Founders Series",
    year: 2024,
    price: 198900,
    mileage: 350,
    transmission: "Single-Speed",
    fuelType: "Electric",
    bodyType: "Coupe",
    color: "Red Multi-Coat",
    colorHex: "#a11d24",
    image:
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "honda-crv-2022",
    make: "Honda",
    model: "CR-V",
    trim: "Touring Hybrid",
    year: 2022,
    price: 38900,
    mileage: 18200,
    transmission: "CVT Automatic",
    fuelType: "Hybrid",
    bodyType: "SUV",
    color: "Platinum White Pearl",
    colorHex: "#e9e8e3",
    image:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "nissan-gtr-2023",
    make: "Nissan",
    model: "GT-R",
    trim: "Premium",
    year: 2023,
    price: 118500,
    mileage: 3200,
    transmission: "6-Speed Dual-Clutch",
    fuelType: "Gasoline",
    bodyType: "Coupe",
    color: "Pearl White",
    colorHex: "#eef0ee",
    image:
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "ford-expedition-2023",
    make: "Ford",
    model: "Expedition",
    trim: "Platinum",
    year: 2023,
    price: 82400,
    mileage: 9100,
    transmission: "10-Speed Automatic",
    fuelType: "Gasoline",
    bodyType: "SUV",
    color: "Agate Black",
    colorHex: "#15171b",
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "mercedes-amg-gtr-2023",
    make: "Mercedes-AMG",
    model: "GT R",
    trim: "Pro",
    year: 2023,
    price: 174500,
    mileage: 2100,
    transmission: "7-Speed DCT",
    fuelType: "Gasoline",
    bodyType: "Coupe",
    color: "Green Hell Magno",
    colorHex: "#3f4a3d",
    image:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "lamborghini-aventador-2023",
    make: "Lamborghini",
    model: "Aventador",
    trim: "SVJ",
    year: 2023,
    price: 573900,
    mileage: 890,
    transmission: "7-Speed ISR",
    fuelType: "Gasoline",
    bodyType: "Coupe",
    color: "Arancio Xanto",
    colorHex: "#d5541c",
    image:
      "https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?auto=format&fit=crop&w=1600&q=80",
  },
];
