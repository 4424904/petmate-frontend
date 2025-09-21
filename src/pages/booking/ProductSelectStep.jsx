import React, { useContext, useState } from "react";
import BookingContext from "./BookingContext";

const CompanyInfoCard = ({ company }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  React.useEffect(() => {
    if (company?.image && company.image !== "/api/placeholder/80/80") {
      setImageSrc(company.image);
    } else {
      setImageSrc("/api/placeholder/80/80");
    }
    setImageLoaded(false);
  }, [company?.image]);

  if (!company || !company.name) return null;

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    if (imageSrc !== "/api/placeholder/80/80") {
      setImageSrc("/api/placeholder/80/80");
    }
    setImageLoaded(true);
  };

  return (
    <div
      style={{
        background: "white",
        padding: "16px",
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <div style={{ position: "relative", width: "80px", height: "80px" }}>
          <img
            src={imageSrc}
            alt={company.name}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "8px",
              objectFit: "cover",
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          {!imageLoaded && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "80px",
                height: "80px",
                borderRadius: "8px",
                backgroundColor: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "#9ca3af",
              }}
            >
              로딩중...
            </div>
          )}
        </div>
        <div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>
            {company.name}
          </h3>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "4px",
              fontSize: "14px",
            }}
          >
            <span>⭐️ {company.rating || "0.0"}</span>
            <span>리뷰 {(company.reviewCount || 0).toLocaleString()}개</span>
          </div>
          <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
            {company.address}
          </p>
        </div>
      </div>
    </div>
  );
};

const ServiceTypeButton = ({ service, isSelected, onClick, disabled }) => (
  <button
    type="button"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      padding: "16px",
      border: `2px solid ${isSelected ? "#eb9666" : "#e5e7eb"}`,
      borderRadius: "12px",
      background: isSelected ? "#fff8f3" : "white",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      minWidth: "80px",
    }}
    onClick={() => !disabled && onClick(service.id)}
    disabled={disabled}
  >
    <span style={{ fontSize: "24px" }}>{getServiceIcon(service.id)}</span>
    <span style={{ fontSize: "14px", fontWeight: "500" }}>{service.name}</span>
  </button>
);

const getServiceIcon = (serviceId) => {
  const id = String(serviceId);
  const icons = {
    C: "🤝",
    W: "🚶",
    G: "✂️",
    M: "🏥",
    E: "📋",
  };

  return icons[id] || "❓";
};

const ProductCard = ({ product, isSelected, onSelect }) => (
  <div
    style={{
      background: "white",
      padding: "20px",
      borderRadius: "12px",
      border: `2px solid ${isSelected ? "#eb9666" : "#e5e7eb"}`,
      cursor: "pointer",
      marginBottom: "16px",
      backgroundColor: isSelected ? "#fff8f3" : "white",
    }}
    onClick={onSelect}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>
          {product.name}
        </h4>
        <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "14px" }}>
          {product.description}
        </p>
        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#e05353" }}>
          {product.price?.toLocaleString()}원
        </div>
      </div>
      {isSelected && (
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "#eb9666",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
          }}
        >
          ✓
        </div>
      )}
    </div>
  </div>
);

const ProductSelectStep = () => {
  const { state, dispatch } = useContext(BookingContext);
  const [selectedServiceType, setSelectedServiceType] = useState(
    state.selectedService
  );

  const handleServiceSelect = (serviceId) => {
    setSelectedServiceType(serviceId);
    dispatch({ type: "SELECT_SERVICE", payload: serviceId });
  };

  const handleProductSelect = (product) => {
    dispatch({ type: "SELECT_PRODUCT", payload: product });
  };

  const handleNext = () => {
    if (state.selectedProduct) {
      dispatch({ type: "SET_STEP", payload: 2 });
    }
  };

  const filteredProducts =
    state.availableProducts?.filter(
      (product) =>
        !selectedServiceType ||
        selectedServiceType === "C" ||
        product.serviceType === selectedServiceType
    ) || [];

  return (
    <div style={{ padding: "16px" }}>
      {/* 업체 정보 */}
      <CompanyInfoCard company={state.selectedStore} />

      {/* 서비스 선택 */}
      <div
        style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "16px",
        }}
      >
        <h4 style={{ margin: "0 0 16px 0" }}>서비스 선택</h4>
        <div style={{ display: "flex", gap: "12px", overflowX: "auto" }}>
          {state.availableServices?.map((service) => (
            <ServiceTypeButton
              key={service.id}
              service={service}
              isSelected={selectedServiceType === service.id}
              onClick={handleServiceSelect}
              disabled={state.loading.products}
            />
          ))}
        </div>
      </div>

      {/* 상품 목록 */}
      <div
        style={{
          background: "white",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "80px",
        }}
      >
        <h4 style={{ margin: "0 0 16px 0" }}>상품 선택</h4>
        {state.loading.products ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            로딩 중...
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isSelected={state.selectedProduct?.id === product.id}
              onSelect={() => handleProductSelect(product)}
            />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            선택한 서비스에 해당하는 상품이 없습니다.
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div
        style={{
          position: "sticky",
          bottom: "0",
          background: "white",
          padding: "16px",
          borderTop: "1px solid #e5e7eb",
          marginLeft: "-16px",
          marginRight: "-16px",
        }}
      >
        <button
          style={{
            width: "100%",
            padding: "16px",
            background: state.selectedProduct
              ? "linear-gradient(135deg, #eb9666, #e05353)"
              : "#e5e7eb",
            color: state.selectedProduct ? "white" : "#9ca3af",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: state.selectedProduct ? "pointer" : "not-allowed",
          }}
          onClick={handleNext}
          disabled={!state.selectedProduct}
        >
          다음 단계
        </button>
      </div>
    </div>
  );
};

export default ProductSelectStep;
