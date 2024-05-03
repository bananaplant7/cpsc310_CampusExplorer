// source: https://www.npmjs.com/package/@react-google-maps/api
import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader, Polyline } from "@react-google-maps/api";
import axios from 'axios';

const containerStyle = {
	width: '100vw',
	height: '100vh'
};

const center = {
	lat: 49.26469584622592,
	lng: -123.25,
};

function App() {
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState([]);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				const { data: response } = await axios.post('http://localhost:4321/query', {
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"campusrooms_fullname",
							"campusrooms_shortname",
							"campusrooms_number",
							"campusrooms_name",
							"campusrooms_address",
							"campusrooms_seats",
							"lat",
							"lon"
						]
					}
				});
				setData(response);
				console.log(response);
			} catch (error) {
				console.error(error.message);
			}
			setLoading(false);
		}
		fetchData();
	}, []);

	const { isLoaded } = useJsApiLoader({
		id: 'google-map-script',
		googleMapsApiKey: "AIzaSyDKqTMLr2cG8T1iIK-vQ4wHh8TiDCXNtEo"
	});

	const [map, setMap] = React.useState(null);
	const [openInfoWindowMarkers, setOpenInfoWindowMarkers] = React.useState([]);

	const onLoad = React.useCallback(function callback(map) {
		const bounds = new window.google.maps.LatLngBounds(center);
		map.fitBounds(bounds);
		setMap(map);
	}, []);
	const onUnmount = React.useCallback(function callback(map) {
		setMap(null);
	}, []);

	const handleMarkerClick = (marker) => {
		if (!openInfoWindowMarkers.includes(marker) && openInfoWindowMarkers.length < 5) {
			setOpenInfoWindowMarkers([...openInfoWindowMarkers, marker]);
		}
	};

	function makePaths() {
		const paths = [];
		for (let i = 0; i < openInfoWindowMarkers.length; i++) {
			for (let j = i + 1; j < openInfoWindowMarkers.length; j++) {
				const startPoint = openInfoWindowMarkers[i];
				const endPoint = openInfoWindowMarkers[j];
				const distance = haversine(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon).toFixed(2)
				const minutes = Math.floor(distance * 12)
				paths.push({
					points: [
						{ lat: startPoint.lat, lng: startPoint.lon },
						{ lat: endPoint.lat, lng: endPoint.lon }
					],
					message: `${startPoint.campusrooms_name} to ${endPoint.campusrooms_name} is ${distance}km which is ~${minutes}min`,
				});
			}
		}
		return paths;
	}

	const handleCloseInfoWindow = (marker) => {
		setOpenInfoWindowMarkers(openInfoWindowMarkers.filter(openMarker => openMarker !== marker));
	};

	// source: https://mapsplatform.google.com/resources/blog/how-calculate-distances-map-maps-javascript-api/
	const haversine = (lat1, lon1, lat2, lon2) => {
		const R = 6371;
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLon = (lon2 - lon1) * Math.PI / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	};

	return isLoaded && (
		<>
			<GoogleMap
				mapContainerStyle={containerStyle}
				center={center}
				zoom={13}
				onLoad={onLoad}
				onUnmount={onUnmount}
			>
				{data.result.map(marker => (
					<Marker
						key={marker.campusrooms_name}
						position={{ lat: marker.lat, lng: marker.lon }}
						onClick={() => handleMarkerClick(marker)}
					/>
				))}
				{openInfoWindowMarkers.map(marker => (
					<InfoWindow
						key={marker.campusrooms_name}
						position={{lat: marker.lat, lng: marker.lon}}
						onCloseClick={() => handleCloseInfoWindow(marker)}
					>
						<div>
							{`full name: ${marker.campusrooms_fullname}`}
							<br />
							{`short name: ${marker.campusrooms_shortname}`}
							<br />
							{`room num: ${marker.campusrooms_number}`}
							<br />
							{`name: ${marker.campusrooms_name}`}
							<br />
							{`addr: ${marker.campusrooms_address}`}
							<br />
							{`seats: ${marker.campusrooms_seats}`}
						</div>
					</InfoWindow>
				))}
			</GoogleMap>
			<div style={{ position: 'absolute', right: 0, top: 0, backgroundColor: 'lightblue', padding: '10px' }}>
				Distance Between Points
				{makePaths().map((path, index) => (
					<div key={index}>{path.message}</div>
				))}
			</div>
		</>
	);
}

export default React.memo(App);
