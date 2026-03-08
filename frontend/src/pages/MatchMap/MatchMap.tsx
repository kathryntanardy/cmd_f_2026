import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import point from "../../assets/points.png";

type LatLng = {
    lat: number;
    lng: number;
};

const center: LatLng = {
    lat: 49.2827,
    lng: -123.1207,
};

const positions: LatLng[] = [
    { lat: 49.2827, lng: -123.1207 }, // Downtown
    { lat: 49.2767, lng: -123.1300 }, // Yaletown
    { lat: 49.2700, lng: -123.1000 }, // Mount Pleasant
    { lat: 49.2950, lng: -123.1200 }, // Coal Harbour
    { lat: 49.2500, lng: -123.1100 }, // South Vancouver
];

const MatchMap: React.FC = () => {
    return (
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <div style={{ width: "100%", height: "100vh" }}>
                <Map
                    defaultCenter={center}
                    defaultZoom={12}
                    mapId="DEMO_MAP_ID"
                >
                    {positions.map((pos, index) => (
                        <AdvancedMarker key={index} position={pos}>
                            <img
                                src={point}
                                style={{
                                    width: "60px",
                                    transform: "translate(-50%, -100%)",
                                }}
                            />
                        </AdvancedMarker>
                    ))}
                </Map>
            </div>
        </APIProvider>
    );
};

export default MatchMap;