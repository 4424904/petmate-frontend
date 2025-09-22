// src/pages/common/Map/components/CompanyListSidebar.jsx
import React from "react";
import CompanyCard from "./CompanyCard";
import Pagination from "./Pagination";
import "./CompanyListSidebar.css";

function CompanyListSidebar({
  searchQuery,
  filteredCompanies,
  selectedService,
  services,
  displayCompanies,
  loading,
  currentCompanies,
  selectedCompany,
  companyMarkers,
  startIndex,
  currentPage,
  totalPages,
  onPageChange,
  onCompanySelect
}) {
  const handleCompanyClick = (company) => {
    const targetMarker = companyMarkers.find(
      (m) => m.companyId === company.id
    );
    if (targetMarker) {
      // 마커가 있으면 마커 클릭 이벤트 트리거
      window.kakao.maps.event.trigger(targetMarker, "click");
    } else {
      // 마커가 없으면 직접 업체 선택 (검색 결과에서 주로 발생)
      onCompanySelect && onCompanySelect(company);
    }
  };

  const getTitle = () => {
    if (searchQuery && filteredCompanies.length > 0) {
      return `'${searchQuery}' 검색 결과 (${filteredCompanies.length}개)`;
    }
    if (selectedService) {
      const serviceName = services.find((s) => s.id === selectedService)?.name;
      return `${serviceName} 펫메이트 목록 (${displayCompanies.length}개)`;
    }
    return `전체 펫메이트 목록 (${displayCompanies.length}개)`;
  };

  const getEmptyMessage = () => {
    if (searchQuery) {
      return `'${searchQuery}'에 대한 검색 결과가 없습니다`;
    }
    return "근처에 업체가 없습니다";
  };

  return (
    <div className="sidebar-area">
      <aside className="sidebar">
        <h3>{getTitle()}</h3>

        {loading ? (
          <div>로딩중...</div>
        ) : (
          <div className="list">
            {displayCompanies.length === 0 ? (
              <div className="list-item">{getEmptyMessage()}</div>
            ) : (
              currentCompanies.map((company, pageIndex) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  index={pageIndex}
                  isSelected={selectedCompany?.id === company.id}
                  onClick={() => handleCompanyClick(company)}
                  services={services}
                  startIndex={startIndex}
                />
              ))
            )}
          </div>
        )}
      </aside>

      {/* 페이징 */}
      {!loading && displayCompanies.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

export default CompanyListSidebar;