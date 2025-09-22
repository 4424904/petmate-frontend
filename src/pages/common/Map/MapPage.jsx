// src/pages/common/Map/MapPage.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  FaHandsHelping,
  FaDog,
  FaCut,
  FaClinicMedical,
  FaSearch,
  FaEllipsisH,
} from "react-icons/fa";
import "./MapPage.css";
import { getNearbyCompanies } from "../../../services/companyService";
import CompanyListSidebar from "./components/CompanyListSidebar";
import { getAddressesByDefault } from "../../../services/addressService";
import { useAuth } from "../../../contexts/AuthContext";
import SearchBar from "./components/SearchBar";
import MapContainer from "./components/MapContainer";
import MapBookingModal from "./components/MapBookingModal";
import { useLocation } from "react-router-dom";

function MapPage() {
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [companyMarkers, setCompanyMarkers] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const initOnceRef = useRef(false);
  const { user } = useAuth();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingCompany, setBookingCompany] = useState(null);
  const location = useLocation(); 
  const firstLoadRef = useRef(true);

  const handleOpenBookingModal = (company) => {
    setBookingCompany(company);
    setBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setBookingModalOpen(false);
    setBookingCompany(null);
  };

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const services = [
    { id: null, name: "전체", icon: <FaSearch /> },
    { id: "1", name: "돌봄", icon: <FaHandsHelping /> },
    { id: "2", name: "산책", icon: <FaDog /> },
    { id: "3", name: "미용", icon: <FaCut /> },
    { id: "4", name: "병원", icon: <FaClinicMedical /> },
    { id: "9", name: "기타", icon: <FaEllipsisH /> },
  ];

  useEffect(() => {
    const loadKakaoMap = () => {
      if (window.kakao && window.kakao.maps) {
        setIsKakaoLoaded(true);
        return;
      }
      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.REACT_APP_KAKAO_MAP_KEY}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () =>
        window.kakao.maps.load(() => setIsKakaoLoaded(true));
      script.onerror = () => console.error("카카오 맵 스크립트 로딩 실패");
      document.head.appendChild(script);
    };
    loadKakaoMap();
  }, []);

  const loadNearbyCompanies = useCallback(
    async (latitude, longitude, zoomLevel = 3) => {
      try {
        setLoading(true);

        // 줌 레벨에 따른 검색 반경 및 마커 수 결정
        let radius, limit;
        if (zoomLevel <= 2) {
          radius = 1.0; limit = 30;  // 매우 가까이
        } else if (zoomLevel <= 4) {
          radius = 2.0; limit = 40;  // 가까이(기본값)
        } else if (zoomLevel <= 6) {
          radius = 3.0; limit = 50;  // 보통
        } else {
          radius = 4.0; limit = 60;  // 멀리
        }

        console.log(`[줌 레벨 ${zoomLevel}] 검색 반경: ${radius}km, 최대 마커: ${limit}개`);

        const data = await getNearbyCompanies(
          latitude,
          longitude,
          radius,
          selectedService
        );

        console.log(`백엔드에서 받은 업체 수: ${data.length}개`);

        // 마커 수 제한
        const limitedData = data.slice(0, limit);
        console.log(`프론트엔드에서 제한된 업체 수: ${limitedData.length}개`);

        setCompanies(limitedData);
      } catch (e) {
        console.log("업체 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    },
    [selectedService]
  );

  const handleServiceFilter = useCallback((serviceId) => {
    setSelectedService(serviceId);
    setCurrentPage(1);
    setSelectedCompany(null); // 선택된 업체 초기화
  }, []);

  const handleSearch = useCallback(
  async (query) => {
    const keywordToSearch = String(query ?? searchQuery);
    if (!keywordToSearch.trim()) return;

    try {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(keywordToSearch, async (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            // 주소 검색 성공 - 해당 위치로 사용자 위치 변경
            setUserLocation({
              latitude: parseFloat(result[0].y),
              longitude: parseFloat(result[0].x),
            });
          } else {
            // 주소 검색 실패 - 전역에서 업체명 검색
            await searchGlobalCompanyName(keywordToSearch);
          }
        });
      } else {
        console.warn("카카오맵 services가 로드되지 않았습니다.");
        await searchGlobalCompanyName(keywordToSearch);
      }
    } catch (e) {
      console.error("검색 오류:", e);
      await searchGlobalCompanyName(keywordToSearch);
    }

  },
  [searchQuery]
);

  // 전역 업체 검색 (넓은 반경으로 검색)
  const searchGlobalCompanyName = useCallback(
    async (query) => {
      try {
        setLoading(true);

        // 현재 위치에서 넓은 반경(50km)으로 검색해서 전역 검색 효과
        const currentLat = userLocation?.latitude || 37.5665; // 기본값: 서울
        const currentLng = userLocation?.longitude || 126.978;

        console.log(`🔍 전역 검색: "${query}" - 50km 반경`);

        const data = await getNearbyCompanies(
          currentLat,
          currentLng,
          50.0, // 넓은 반경으로 전역 검색 효과
          selectedService,
          query // keyword 추가
        );

        // 검색어로 필터링
        const filtered = data.filter(
          (company) =>
            company.name.toLowerCase().includes(query.toLowerCase()) ||
            company.roadAddr.toLowerCase().includes(query.toLowerCase())
        );

        console.log(`📍 전역 검색 결과: ${filtered.length}개 업체 발견`);

        if (filtered.length > 0) {
          const firstResult = filtered[0];
          setSelectedCompany(firstResult);
        }

        setFilteredCompanies(filtered);
        setCurrentPage(1);
      } catch (e) {
        console.error("전역 검색 실패:", e);
      } finally {
        setLoading(false);
      }
    },
    [userLocation, selectedService]
  );

  const searchByCompanyName = useCallback(
    (query) => {
      const filtered = companies.filter(
        (company) =>
          company.name.toLowerCase().includes(query.toLowerCase()) ||
          company.roadAddr.toLowerCase().includes(query.toLowerCase())
      );

      if (filtered.length > 0) {
        const firstResult = filtered[0];
        setSelectedCompany(firstResult);
      }

      setFilteredCompanies(filtered);
      setCurrentPage(1);
    },
    [companies]
  );

  const handleSearchInput = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim() === "") {
      setFilteredCompanies([]);
    }
  }, []);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleSearch(searchQuery); 
      }
    },
    [handleSearch, searchQuery]
  );

  const handleCompanySelect = useCallback((company) => {
    setSelectedCompany(company);
  }, []);

  const handleMarkersChange = useCallback((markers) => {
    setCompanyMarkers(markers);
  }, []);

  const displayCompanies = useMemo(() => {
    // 기본 데이터 결정 (검색 결과가 있으면 검색 결과, 없으면 전체 업체)
    const baseCompanies = filteredCompanies.length > 0 ? filteredCompanies : companies;

    // 서비스 필터 적용
    if (selectedService === null) {
      return baseCompanies; // 전체 선택시 필터링 없음
    }

    return baseCompanies.filter(company => company.repService === selectedService);
  }, [filteredCompanies, companies, selectedService]);
  const totalPages = Math.ceil(displayCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCompanies = displayCompanies.slice(startIndex, endIndex);

  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyCompanies(userLocation.latitude, userLocation.longitude);
    }
  }, [userLocation, loadNearbyCompanies]);

  useEffect(() => {
    if (!isKakaoLoaded || initOnceRef.current) return;
    initOnceRef.current = true;

    const initailizeLocation = async () => {
      try {
        if (user?.userId) {
          try {
            const defaultAddress = await getAddressesByDefault(user.userId);
            if (defaultAddress?.latitude && defaultAddress?.longitude) {
              setUserLocation({
                latitude: defaultAddress.latitude,
                longitude: defaultAddress.longitude,
              });
              return;
            }
          } catch (e) {
            console.log("기본주소 로드 실패, GPS 시도:", e);
          }
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setUserLocation({ latitude, longitude });
            },
            () => {
              const lat = 37.5665,
                lng = 126.978;
              setUserLocation({ latitude: lat, longitude: lng });
            }
          );
        } else {
          const lat = 37.5665,
            lng = 126.978;
          setUserLocation({ latitude: lat, longitude: lng });
        }
      } catch (e) {
        console.error("위치 초기화 오류:", e);
        const lat = 37.5665,
          lng = 126.978;
        setUserLocation({ latitude: lat, longitude: lng });
      }
    };

    initailizeLocation();
  }, [isKakaoLoaded, user]);

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const service = params.get("service");
  const keyword = params.get("keyword");

  if (service) {
    setSelectedService(service);
  }

  if (keyword && String(keyword).trim() !== "") {
    setSearchQuery(keyword);   
  }
}, [location.search]);

useEffect(() => {
  if (
    isKakaoLoaded && 
    firstLoadRef.current && 
    searchQuery.trim() !== "" && 
    userLocation && 
    companies.length > 0
  ) {
    console.log("🔎 자동검색 실행:", searchQuery);
    handleSearch(searchQuery);   
    firstLoadRef.current = false;
  }
}, [isKakaoLoaded, searchQuery, handleSearch, userLocation, companies.length]);

  return (
    <div id="map-page" className="map_wrap">
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchInput}
        onSearch={handleSearch}
        onKeyPress={handleKeyPress}
        services={services}
        selectedService={selectedService}
        onServiceFilter={handleServiceFilter}
      />

      <div className="map_content">
        <CompanyListSidebar
          searchQuery={searchQuery}
          filteredCompanies={filteredCompanies}
          selectedService={selectedService}
          services={services}
          displayCompanies={displayCompanies}
          loading={loading}
          currentCompanies={currentCompanies}
          selectedCompany={selectedCompany}
          companyMarkers={companyMarkers}
          startIndex={startIndex}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onCompanySelect={handleCompanySelect}
        />

        <MapContainer
          isKakaoLoaded={isKakaoLoaded}
          userLocation={userLocation}
          companies={companies}
          selectedCompany={selectedCompany}
          services={services}
          onCompanySelect={handleCompanySelect}
          onLocationChange={loadNearbyCompanies}
          onMarkersChange={handleMarkersChange}
          onBookingClick={handleOpenBookingModal}
        />

        {bookingModalOpen && (
          <>
            <div className="booking-modal-backdrop" onClick={handleCloseBookingModal}></div>
            <div className="booking-modal-overlay-center">
              <MapBookingModal
                selectedCompany={bookingCompany}
                onClose={handleCloseBookingModal}
                isOpen={bookingModalOpen}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MapPage;
