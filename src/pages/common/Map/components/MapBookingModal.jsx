import React, { useEffect, useReducer } from "react";
import ProductSelectStep from "../../../booking/ProductSelectStep";
import DateSelectStep from "../../../booking/DateSelectStep";
import BookingConfirmStep from "../../../booking/BookingConfirmStep";
import BookingCompleteStep from "../../../booking/BookingCompleteStep";
import BookingContext from "../../../booking/BookingContext";
import { getProductsByCompany } from "../../../../services/product/productService";
import { getServiceCategoriesForBooking } from "./../../../../services/product/productService";
import "./MapBookingModal.css";

// 예약상태관리 (기존과 동일)
const initialState = {
  step: 1,
  selectedService: "C",
  selectedProduct: null,
  selectedPets: [],
  availablePets: [],
  selectedDate: null,
  selectedTimeSlot: null,
  peopleCount: 1,
  specialRequests: "",
  reservationStatus: "pending",
  selectedStore: {
    id: null,
    name: "",
    rating: 0,
    reviewCount: 0,
    address: "",
    phone: "",
    image: "/api/placeholder/300/200",
    description: "",
    repService: "",
  },
  availableProducts: [],
  availableServices: [],
  availableTimeSlots: [],
  loading: {
    products: false,
    timeSlots: false,
    booking: false,
  },
};

const reservationReducer = (state, action) => {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SELECT_SERVICE":
      return {
        ...state,
        selectedService: action.payload,
        selectedProduct: null,
      };
    case "SELECT_PRODUCT":
      return { ...state, selectedProduct: action.payload };
    case "TOGGLE_PET":
      const petId = action.payload;
      const newSelectedPets = state.selectedPets.includes(petId)
        ? state.selectedPets.filter((id) => id !== petId)
        : [...state.selectedPets, petId];
      return { ...state, selectedPets: newSelectedPets };
    case "SELECT_DATE":
      return { ...state, selectedDate: action.payload };
    case "SELECT_TIME_SLOT":
      return { ...state, selectedTimeSlot: action.payload };
    case "SET_PEOPLE_COUNT":
      return { ...state, peopleCount: action.payload };
    case "SET_SPECIAL_REQUESTS":
      return { ...state, specialRequests: action.payload };
    case "SET_SELECTED_STORE":
      return { ...state, selectedStore: action.payload };
    case "SET_AVAILABLE_PRODUCTS":
      return { ...state, availableProducts: action.payload };
    case "SET_AVAILABLE_SERVICES":
      return { ...state, availableServices: action.payload };
    case "SET_AVAILABLE_TIME_SLOTS":
      return { ...state, availableTimeSlots: action.payload };
    case "SET_AVAILABLE_PETS":
      return { ...state, availablePets: action.payload };
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.field]: action.value },
      };
    default:
      return state;
  }
};

const MapBookingModal = ({ selectedCompany, onClose, isOpen }) => {
  console.log("MapBookingModal 받은 업체 정보:", selectedCompany);

  const initialStateWithCompany = selectedCompany
    ? {
        ...initialState,
        selectedStore: {
          id: selectedCompany.id,
          name: selectedCompany.name,
          rating: 4.8,
          reviewCount: 1234,
          address: selectedCompany.roadAddr,
          phone: selectedCompany.tel,
          image: "/api/placeholder/300/200",
          companyId: selectedCompany.id,
          description: selectedCompany.description || "",
          repService: selectedCompany.repService || "",
        },
      }
    : initialState;

  const [state, dispatch] = useReducer(
    reservationReducer,
    initialStateWithCompany
  );

  useEffect(() => {
    if (selectedCompany?.id) {
      loadCompanyData(selectedCompany.id);
    }
  }, [selectedCompany]);

  const loadCompanyData = async (companyId) => {
    try {
      dispatch({ type: "SET_LOADING", field: "products", value: true });
      const [products, services] = await Promise.all([
        getProductsByCompany(companyId),
        getServiceCategoriesForBooking(),
      ]);

      dispatch({ type: "SET_AVAILABLE_PRODUCTS", payload: products });
      dispatch({ type: "SET_AVAILABLE_SERVICES", payload: services });

      console.log("로드된 상품:", products);
      console.log("로드된 서비스:", services);
    } catch (error) {
      console.error("업체 데이터 로드 실패:", error);
    } finally {
      dispatch({ type: "SET_LOADING", field: "products", value: false });
    }
  };

  if (!isOpen) return null;

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <ProductSelectStep />;
      case 2:
        return <DateSelectStep />;
      case 3:
        return <BookingConfirmStep />;
      case 4:
        return <BookingCompleteStep />;
      default:
        return <ProductSelectStep />;
    }
  };

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      <div className="map-booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-booking-header">
          <div className="map-booking-header-content">
            <button className="map-booking-close" onClick={onClose}>
              ✖️
            </button>
            <h1 className="map-booking-title">예약하기</h1>
          </div>
        </div>
        <div className="map-booking-body">
          {renderStep()}
        </div>
      </div>
    </BookingContext.Provider>
  );
};

export default MapBookingModal;