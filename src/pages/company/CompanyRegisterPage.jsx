import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CompanyRegisterPage.css";
import { registerCompany, updateCompany, getCompanyById, getBusinessInfo, checkPersonalCompanyExists } from "../../services/companyService";
import MapModal from "../user/owner/MyPage/Address/components/MapModal";
import { ImageUploadViewer } from "../../util/ImageUtil";
import { Map, MapPinned } from "lucide-react";

function CompanyRegisterPage() {
    // URL에서 ID 파라미터 가져오기 (수정 모드 감지)
    const { id: companyId } = useParams();
    const isEditMode = Boolean(companyId);
    const companyImageRef = useRef(null);
    const navigate = useNavigate();

    const serviceCategories = ["돌봄", "산책", "미용", "병원", "기타"];
    const days = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
    const makeDefault = () =>
        Object.fromEntries(
            days.map(d => [d, {open: "09:00", close: "18:00", closed:false }])
        );
    const clone = (obj) =>
        typeof structuredClone === "function" ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));

    // 서비스 코드 매핑
    const serviceCodeMapping = {
        '돌봄': '1', '산책': '2', '미용': '3', '병원': '4', '기타': '9'
    };
    const serviceLabelMapping = {
        '1': '돌봄', '2': '산책', '3': '미용', '4': '병원', '9': '기타'
    };

    // hook
    const [companyType, setCompanyType] = useState("PERSONAL");
    const [checkService, setCheckService] = useState({
        전체: false,
        돌봄: false,
        산책: false,
        미용: false,
        병원: false,
        기타: false,
    });
    const [allDay, setAllDay] = useState(false);
    const [time, setTime] = useState(() => makeDefault());
    const [files, setFiles] = useState([]);
    const [showMapModal, setShowMapModal] = useState(false);

    // 폼 입력 필드 상태
    const [formInputs, setFormInputs] = useState({
        // 개인(일반인) 정보
        ssnFirst: '',
        personalCompanyName: '',
        // 개인/법인사업자 정보  
        businessNumber: '',
        corporationName: '',
        representativeName: '',
        // 공통 정보
        roadAddr: '',
        detailAddr: '',
        postcode: '',
        latitude: '',
        longitude: '',
        mainService: '',
        phone1: '',
        phone2: '',
        phone3: '',
        introduction: ''
    });
    
    // 수정 모드용 추가 상태들
    const [loading, setLoading] = useState(isEditMode); // 수정 모드일 때만 로딩
    const [isTypeLocked, setIsTypeLocked] = useState(false); // 라디오 버튼 잠금
    const [isIdBlockLocked, setIsIdBlockLocked] = useState(false); // 식별 정보 잠금
    
    const backupRef = useRef(null);
    const representativeNameRef = useRef(null); // 성함 입력창 ref
    const telSecondRef = useRef(null);
    const telThirdRef = useRef(null);

    // 다음 주소 API 스크립트 로드
    useEffect(() => {
        if (!window.daum) {
            const postcodeScript = document.createElement('script');
            postcodeScript.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
            document.head.appendChild(postcodeScript);
        }
        
        // 카카오 맵 API 스크립트 로드 (좌표 변환용)
        if (!window.kakao) {
            const kakaoScript = document.createElement('script');
            kakaoScript.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.REACT_APP_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
            kakaoScript.onload = () => {
                window.kakao.maps.load(() => {
                    console.log('카카오맵 API 로드 완료');
                });
            };
            document.head.appendChild(kakaoScript);
        }
    }, []);

    // 수정 모드일 때 데이터 로드
    useEffect(() => {
        if (isEditMode && companyId) {
            loadCompanyData();
        }
    }, [isEditMode, companyId]); // loadCompanyData는 의존성에서 제외 (함수 내부에서만 사용)

    const loadCompanyData = async () => {
        try {
            const c = await getCompanyById(companyId);

            // 유형 결정 및 잠금
            const dbType = c?.type || "";
            const lockedType = dbType === "B" ? "BUSINESS" : "PERSONAL";
            setCompanyType(lockedType);
            setIsTypeLocked(true); // 수정 모드에서는 타입 변경 불가
            setIsIdBlockLocked(true); // 식별 정보 변경 불가

            // 전화번호 파싱
            const tel = c?.tel || "";
            const [p1 = "", p2 = "", p3 = ""] = tel.split("-");

            // 주소 정보
            const latitude = c?.lat ?? c?.latitude;
            const longitude = c?.lng ?? c?.longitude;

            // 개인 정보 처리
            const ssnFirst = c?.ssnFirst || "";

            // 사업자 정보 처리
            const corporationName = c?.name || "";
            const repName = c?.repName || "";
            const bizRegNo = c?.bizRegNo || "";

            // 대표 서비스 처리
            const rawMainService = c?.repService ?? "";
            const normalizedMainService = serviceLabelMapping[rawMainService] || "";

            // 제공 서비스 처리
            if (c?.services) {
                const services = typeof c.services === "string" ? JSON.parse(c.services) : c.services;
                const normalized = serviceCategories.reduce(
                    (acc, s) => ({ ...acc, [s]: !!services[s] }),
                    {}
                );
                const allChecked = serviceCategories.every((s) => normalized[s]);
                setCheckService({ 전체: allChecked, ...normalized });
            }

            // 운영시간 처리
            if (c?.operatingHours) {
                const oh = typeof c.operatingHours === "string" ? JSON.parse(c.operatingHours) : c.operatingHours;
                setAllDay(Boolean(oh?.allDay));
                setTime(oh?.schedule ?? makeDefault());
            } else {
                setAllDay(false);
                setTime(makeDefault());
            }

            // 폼 데이터 설정
            setFormInputs({
                // 개인(일반인) 정보
                ssnFirst: ssnFirst,
                // 사업자 정보
                businessNumber: formatBusinessNumber(bizRegNo),
                corporationName: corporationName,
                representativeName: repName,
                // 공통
                roadAddr: c?.roadAddr ?? "",
                detailAddr: c?.detailAddr ?? "",
                postcode: c?.postcode ?? "",
                latitude: latitude != null ? String(latitude) : "",
                longitude: longitude != null ? String(longitude) : "",
                mainService: normalizedMainService,
                phone1: p1,
                phone2: p2,
                phone3: p3,
                introduction: c?.descText ?? "",
            });

            setLoading(false);
        } catch (error) {
            console.error('업체 정보 로드 오류:', error);
            alert('업체 정보를 불러오는 중 오류가 발생했습니다.');
            navigate('/companymanage');
        }
    };

    // 사업자번호 포맷팅 함수
    const formatBusinessNumber = (bizRegNo) => {
        if (!bizRegNo) return "";
        const cleaned = bizRegNo.replace(/[^0-9]/g, "");
        if (cleaned.length === 10) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
        }
        return cleaned;
    };

    // handler

    // 입력 필드 값 변경 핸들러
    const handleInputChange = (field, value) => {
        setFormInputs(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // 숫자만 입력 허용 함수
    const handleNumericInput = (value, maxLength) => {
        return value.replace(/[^0-9]/g, '').slice(0, maxLength);
    };

    // 사업자등록번호 입력 핸들러 (기존 formatBusinessNumber 함수 사용)
    const handleBusinessNumberInput = (e) => {
        const numbers = e.target.value.replace(/[^0-9]/g, '');
        let formattedValue;
        if (numbers.length <= 3) {
            formattedValue = numbers;
        } else if (numbers.length <= 5) {
            formattedValue = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        } else {
            formattedValue = `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
        }
        handleInputChange('businessNumber', formattedValue);
    };

    // 자동 포커스 함수들
    const handleSsnFirstInput = (e) => {
        const numericValue = handleNumericInput(e.target.value, 6);
        handleInputChange('ssnFirst', numericValue);

        // 6자리 입력 완료 시 성함 입력창으로 포커스 이동
        if (numericValue.length === 6 && representativeNameRef.current !== null) {
            representativeNameRef.current.focus();
        }
    };


    const handleTelFirstInput = (e) => {
        const numericValue = handleNumericInput(e.target.value, 4);
        handleInputChange('phone1', numericValue);
        // 02는 2자리에서, 다른 번호는 3자리에서 자동 포커스 이동
        if (telSecondRef.current !== null) {
            if (numericValue === '02' || numericValue.length === 3) {
                telSecondRef.current.focus();
            }
        }
    };
                                                 
    const handleTelSecondInput = (e) => {
        const numericValue = handleNumericInput(e.target.value, 4);
        handleInputChange('phone2', numericValue);
        if (numericValue.length === 4 && telThirdRef.current !== null) {
            telThirdRef.current.focus();  
        }           
    };

    const handleTelThirdInput = (e) => {
        const numericValue = handleNumericInput(e.target.value, 4);
        handleInputChange('phone3', numericValue);
    };

    // 폼 유효성 검사 함수
    const validateForm = () => {
        let hasErrors = false;

        // 개인(일반인) vs 개인/법인사업자별 필수 필드 체크
        if (companyType === "PERSONAL") {
            // 개인(일반인) - 주민번호와 성함 필요
            if (!formInputs.representativeName.trim()) {
                hasErrors = true;
            }
            // 수정 모드가 아닐 때만 주민번호 유효성 검사
            if (!isEditMode) {
                if (!formInputs.ssnFirst || formInputs.ssnFirst.length !== 6) {
                    hasErrors = true;
                }
            }
        } else {
            // 개인/법인사업자 - 사업자등록번호 필수
            if (!formInputs.businessNumber.trim() ||
                !formInputs.corporationName.trim() ||
                !formInputs.representativeName.trim()) {
                hasErrors = true;
            }
        }

        // 공통 필수 필드 체크
        if (!formInputs.roadAddr.trim() ||
            !formInputs.mainService ||
            !formInputs.phone1 || (formInputs.phone1.length !== 2 && formInputs.phone1.length !== 3) ||
            !formInputs.phone2 || formInputs.phone2.length !== 4 ||
            !formInputs.phone3 || formInputs.phone3.length !== 4) {
            hasErrors = true;
        }

        // 제공 서비스 체크 (전체 제외하고 최소 1개 선택)
        const selectedServices = Object.entries(checkService)
            .filter(([key, value]) => key !== '전체' && value === true);
        if (selectedServices.length === 0) {
            hasErrors = true;
        }

        return hasErrors;
    };

    // 사업자번호 중복 체크 (DB 기반)
    const handleBizNoSearchBtnClick = async () => {
        console.log("사업자등록번호 중복 체크 실행");

        const businessNumber = formInputs.businessNumber.trim();

        // 사업자번호 형식 체크
        if (!businessNumber) {
            alert("사업자등록번호를 입력해주세요.");
            return;
        }

        // 숫자만 추출 (하이픈 제거)
        const cleanBusinessNumber = businessNumber.replace(/[^0-9]/g, '');

        if (cleanBusinessNumber.length !== 10) {
            alert("올바른 사업자등록번호를 입력해주세요. (10자리 숫자)");
            return;
        }

        try {
            // DB 기반 중복 체크
            const result = await getBusinessInfo(cleanBusinessNumber);

            if (result.isValid) {
                alert(`등록 가능한 사업자등록번호입니다.\n\n사업자등록번호: ${result.businessNumber}\n\n※ 상호명과 대표자명을 직접 입력해주세요.`);

                // 상호명 입력 필드로 포커스 이동
                const corporationNameInput = document.querySelector('input[placeholder*="홍길동펫샵"]');
                if (corporationNameInput) {
                    corporationNameInput.focus();
                }
            } else {
                alert(`${result.message}`);
            }
        } catch (error) {
            console.error('사업자등록번호 중복 체크 중 오류:', error);

            // 에러 응답에서 메시지 추출
            let errorMessage = '사업자등록번호 확인 중 오류가 발생했습니다.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            alert(`${errorMessage}`);
        }
    }

    // 주소 검색
    const handleAddressSearchBtnClick = () => {
        console.log("주소 검색 실행");

        if (!window.daum) {
            alert("주소 검색 서비스를 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        new window.daum.Postcode({
            oncomplete: function(data) {
                const addr = data.address; // 최종 주소
                const postcode = data.zonecode; // 우편번호
                
                // 주소와 우편번호를 상태에 저장
                handleInputChange('roadAddr', addr);
                handleInputChange('postcode', postcode);

                // 카카오 좌표계 변환 API 호출
                if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
                    const geocoder = new window.kakao.maps.services.Geocoder();
                    geocoder.addressSearch(addr, function(result, status) {
                        if (status === window.kakao.maps.services.Status.OK) {
                            const latitude = parseFloat(result[0].y);
                            const longitude = parseFloat(result[0].x);

                            handleInputChange('latitude', latitude.toString());
                            handleInputChange('longitude', longitude.toString());

                            console.log('검색된 주소:', addr, '우편번호:', postcode, '좌표:', { latitude, longitude });

                        } else {
                            // 좌표 변환 실패시 좌표 없이 저장
                            console.log('좌표 변환 실패, 주소만 저장:', addr, '우편번호:', postcode);
                        }
                    });
                } else {
                    // 카카오 맵 API가 로드되지 않은 경우
                    console.log('카카오 맵 API 없음, 주소만 저장:', addr, '우편번호:', postcode);
                }
            }
        }).open();
    }

    // 제공 서비스 전체 체크박스 변경
    const handleAllServiceChange = (e) => {
        console.log("대표 서비스 전체 선택");

        const isChecked = e.target.checked;
        const newState = {};
        serviceCategories.forEach((item) => (newState[item] = isChecked));

        setCheckService({
            전체: isChecked,
            ...newState,
        });
  };

    // 제공 서비스 개별 체크박스 변경
    const handleServiceChange = (e) => {
        console.log("대표 서비스 개별 선택");

        const {name, checked} = e.target;

        setCheckService((prev) => {
            const updated = {...prev, [name]: checked};

            // 전체 선택 여부 재계산
            const allChecked = serviceCategories.every((item) => updated[item]);
            updated.전체 = allChecked;

            return updated;
        });

    };



    // 운영시간 전체 체크박스 변경
    const handleAllTimeChange = (e) => {
        console.log("운영시간 전체 선택");

        const isChecked = e.target.checked;
        setAllDay(isChecked);

        if(isChecked) {
            setTime((prev) => {
                const base = prev ?? makeDefault();
                backupRef.current = clone(base);   // ← 여기서 백업 (가장 안전)
                const next = { ...base };
                days.forEach((d) => (next[d] = { open: "00:00", close: "23:59", closed: false }));
                return next;
            });
        } else {
            setTime((prev) => {
                const restored = backupRef.current ?? prev ?? makeDefault();
                backupRef.current = null; // 한번 쓰고 비우기
                return restored;
            });
        }
    };

    // 운영시간 변경
    const handleTimeChange = (day, field, value) => {
        console.log("운영시간 변경");
        setTime(prev => ({
            ...prev, 
            [day]: {            // 특정 요일만 바꿈
                ...prev[day],   // 기존 요일 값 유지
                [field]: value  // 특정 필드만 업데이트
            }
        }));
    };

    // 운영시간 휴무 변경
    const handleClosedChange = (day, checked) => {
        console.log("운영시간 휴무 선택");
        setTime(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                closed: checked // closed 값만 업데이트
            }
        }));
    };

    // 업체 등록 취소
    const handleCompanyRegisterCancleBtnClick = () => {
        console.log("업체 등록 취소");

        if(window.confirm("업체 등록을 취소하시겠습니까?")) {
            navigate("/companymanage");
        } else {
            return null;
        }

    }

    // 업체 등록
    // 지도 모달 핸들러
    const handleLocationSelect = (location) => {
        handleInputChange('roadAddr', location.address);
        if (location.postcode) {
            handleInputChange('postcode', location.postcode);
        }
        handleInputChange('latitude', location.latitude.toString());
        handleInputChange('longitude', location.longitude.toString());
        setShowMapModal(false);

        // 최종 확정 값 찍기
        console.log("[선택 위치 확정]", {
            address: location.address,
            postcode: location.postcode ?? "",
            latitude: location.latitude,
            longitude: location.longitude,
        });
        
    };

    const handleCloseMapModal = () => {
        setShowMapModal(false);
    };

    const handleCompanySubmitBtnClick = async () => {
        const action = isEditMode ? "수정" : "등록";
        console.log(`업체 ${action} 요청`);

        // 폼 유효성 검사
        const hasErrors = validateForm();
        if (hasErrors) {
            alert("입력되지 않은 정보가 있습니다.");
            return;
        }

        if(window.confirm(`업체 ${action}을 하시겠습니까?`)) {
            try {
                // 개인 업체 등록 시 중복 등록 확인
                if (!isEditMode && companyType === "PERSONAL") {
                    console.log("개인 업체 중복 등록 확인 시작...");
                    const checkResult = await checkPersonalCompanyExists();

                    if (checkResult.exists) {
                        alert(`개인 업체 중복 등록 불가: ${checkResult.message || '이미 등록된 개인 업체가 있습니다.'}`);
                        return;
                    }

                    console.log("개인 업체 중복 확인 완료:", checkResult.message);
                }
                // FormData 생성
                const formData = new FormData();
                
                if (companyImageRef.current && companyImageRef.current.hasFiles) {
                    await companyImageRef.current.handleUpload();
                }

                if (isEditMode) {
                    // 수정 모드: CompanyUpdateRequestDto에 맞는 필드만 전송
                    // name 필드: BUSINESS는 상호명, PERSONAL은 개인명
                    if (companyType === "BUSINESS") {
                        formData.append("name", formInputs.corporationName);
                    } else if (companyType === "PERSONAL") {
                        formData.append("name", formInputs.representativeName);
                        formData.append("representativeName", formInputs.representativeName); // 개인: 이름=대표자명
                    }
                } else {
                    // 등록 모드: 기존 로직 유지
                    const typeCode = companyType === "PERSONAL" ? "PERSONAL" : "BUSINESS";
                    formData.append('type', typeCode);
                    
                    // 개인(일반인) vs 개인/법인사업자별 정보
                    if (companyType === "PERSONAL") {
                        // 개인(일반인) - 주민번호와 성함
                        formData.append('representativeName', formInputs.representativeName); // 개인: 이름=대표자명
                        // 수정 모드가 아닐 때만 주민번호 전송
                        if (!isEditMode) {
                            formData.append('ssnFirst', formInputs.ssnFirst);
                        }
                    } else {
                        // 개인/법인사업자 - 사업자번호, 상호명, 대표자명
                        const cleanBizRegNo = formInputs.businessNumber.replace(/[^0-9]/g, '');
                        formData.append('bizRegNo', cleanBizRegNo);
                        formData.append('corporationName', formInputs.corporationName);
                        formData.append('representativeName', formInputs.representativeName);
                    }
                }
                
                // 공통 정보
                formData.append('roadAddr', formInputs.roadAddr);
                formData.append('detailAddr', formInputs.detailAddr);
                formData.append('postcode', formInputs.postcode);
                formData.append('latitude', formInputs.latitude);
                formData.append('longitude', formInputs.longitude);
                
                // 연락처 (3개 필드를 하나로 합침)
                const fullPhoneNumber = `${formInputs.phone1}-${formInputs.phone2}-${formInputs.phone3}`;
                formData.append('tel', fullPhoneNumber);
                
                // 서비스 관련
                if (isEditMode) {
                    // 수정 모드: 한글명으로 전송 (백엔드에서 코드로 변환)
                    formData.append('repService', formInputs.mainService);
                } else {
                    // 등록 모드: 숫자 코드로 변환
                    const repServiceCode = serviceCodeMapping[formInputs.mainService] || formInputs.mainService;
                    formData.append('repService', repServiceCode);
                }
                
                formData.append('services', JSON.stringify(checkService));
                
                // 운영시간
                formData.append('operatingHours', JSON.stringify({
                    allDay: allDay,
                    schedule: time
                }));
                
                // 업체 소개
                if (isEditMode) {
                    formData.append('descText', formInputs.introduction);
                } else {
                    formData.append('introduction', formInputs.introduction);
                    
                    // 파일 추가 (등록 시에만)
                    files.forEach((file) => {
                        formData.append('images', file);
                    });
                }

                // API 호출 분기
                let result;
                if (isEditMode) {
                    result = await updateCompany(companyId, formData);
                } else {
                    result = await registerCompany(formData);
                }
                
                if (result) {
                    alert(`업체 ${action}이 완료되었습니다!`);
                    navigate('/companymanage');
                }
            } catch (error) {
                console.error(`업체 ${action} 중 오류:`, error);

                // 백엔드에서 보낸 에러 메시지 추출
                let errorMessage = `${action} 중 오류가 발생했습니다.`;

                if (error.response?.data?.message) {
                    // 백엔드에서 구조화된 에러 응답을 보낸 경우
                    errorMessage = error.response.data.message;
                } else if (error.response?.data) {
                    // 백엔드에서 단순 문자열 에러를 보낸 경우
                    errorMessage = typeof error.response.data === 'string'
                        ? error.response.data
                        : JSON.stringify(error.response.data);
                } else if (error.message) {
                    // 네트워크 에러 등
                    errorMessage = error.message;
                }

                alert(errorMessage);
            }
        }
    }
                                                            

    if (loading) {
        return <div className="loading">로딩 중...</div>;
    }

    return(
        <div className="company_register_page">
            <div className="company_register_main">
                <div className="company_register_content">
                    {/* 헤더 섹션 */}
                    <div className="section-header">
                        <div className="header_info">
                        <h2 className="section-title">{isEditMode ? "업체 수정" : "업체 등록"}</h2>
                        <p className="section-subtitle">{isEditMode ? "펫케어 업체 정보를 수정하세요" : "펫케어 업체 정보를 등록하세요"}</p>
                        </div>
                    </div>

                    {/* 업체 구분 */}
                    <div className="company_register_section">
                        <h3>업체 구분</h3>
                        <div className="radio_group">
                            <label className={`radio_item ${isTypeLocked ? "locked" : ""}`}>
                            <input
                                type="radio"
                                name="company_type"
                                value="PERSONAL"
                                checked={companyType === "PERSONAL"}
                                onChange={(e) => !isTypeLocked && setCompanyType(e.target.value)}
                                disabled={isTypeLocked}
                            />
                            <span>개인(일반인)</span>
                        </label>

                        <label className={`radio_item ${isTypeLocked ? "locked" : ""}`}>
                            <input
                                type="radio"
                                name="company_type"
                                value="BUSINESS"
                                checked={companyType === "BUSINESS"}
                                onChange={(e) => !isTypeLocked && setCompanyType(e.target.value)}
                                disabled={isTypeLocked}
                            />
                            <span>개인/법인사업자</span>
                        </label>
                        </div>
                        
                        {/* 사업자 정보 */}
                        {companyType === "PERSONAL" 
                        ?
                            (
                                <>
                                    <div className="company_form_grid">
                                        <div className="company_form_group">
                                            <span>생년월일</span>
                                            <input
                                                type="text"
                                                className="form_input"
                                                maxLength={6}
                                                placeholder="YYMMDD (예: 901225)"
                                                value={formInputs.ssnFirst}
                                                onChange={handleSsnFirstInput}
                                                readOnly={isIdBlockLocked}
                                                disabled={isIdBlockLocked}
                                            />
                                        </div>
                                        <div className="company_form_group">
                                            <span>성함</span>
                                            <input
                                                type="text"
                                                className="form_input"
                                                placeholder="홍길동"
                                                value={formInputs.representativeName}
                                                onChange={(e) => handleInputChange('representativeName', e.target.value)}
                                                ref={representativeNameRef}
                                                readOnly={isIdBlockLocked}
                                                disabled={isIdBlockLocked}
                                            />
                                        </div>
                                    </div>
                                </>
                            )
                            
                        :
                            (
                                <>
                                    <div className="company_form_grid">
                                        <div className="company_form_group" style={{ gridColumn: '1 / -1' }}>
                                            <span>사업자등록번호</span>
                                            <div className="input_button_group">
                                                <input
                                                    type="text"
                                                    className="form_input"
                                                    placeholder="123-45-67890"
                                                    value={formInputs.businessNumber}
                                                    onChange={handleBusinessNumberInput}
                                                    maxLength={12}
                                                    readOnly={isIdBlockLocked}
                                                    disabled={isIdBlockLocked}
                                                />
                                                <button type="button" className="search_btn" onClick={handleBizNoSearchBtnClick}>
                                                    번호 검증
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="company_form_grid">
                                        <div className="company_form_group">
                                            <span>상호명</span>
                                            <input 
                                                type="text"
                                                className="form_input"
                                                placeholder="홍길동펫샵 또는 (주)펫메이트"
                                                value={formInputs.corporationName}
                                                onChange={(e) => handleInputChange('corporationName', e.target.value)}
                                                readOnly={isIdBlockLocked}
                                                disabled={isIdBlockLocked}
                                            />
                                        </div>
                                        <div className="company_form_group">
                                            <span>대표자명</span>
                                            <input 
                                                type="text"
                                                className="form_input"
                                                placeholder="홍길동"
                                                value={formInputs.representativeName}
                                                onChange={(e) => handleInputChange('representativeName', e.target.value)}
                                                readOnly={isIdBlockLocked}
                                                disabled={isIdBlockLocked}
                                            />
                                        </div>
                                    </div>
                                </>
                            )
                        }
                        
                        {/* 주소 정보 */}
                        <div className="company_form_grid">
                            <div className="company_form_group">
                                <span>주소</span>
                                <div className="input_button_group">
                                    <input 
                                        type="text"
                                        className="form_input"
                                        placeholder="도로명 주소를 검색해주세요"
                                        value={formInputs.roadAddr}
                                        readOnly
                                    />
                                    <button type="button" className="search_btn" onClick={handleAddressSearchBtnClick}>
                                        주소 검색
                                    </button>
                                </div>
                                <div className="address_search_buttons">
                                    <button
                                        type="button"
                                        className="map_search_button"
                                        onClick={() => setShowMapModal(true)}
                                    >
                                        <Map size={16} />
                                        지도에서 찾기
                                    </button>
                                </div>
                            </div>
                            <div className="company_form_group">
                                <span>상세주소</span>
                                <input 
                                    type="text"
                                    className="form_input"
                                    placeholder="상세 주소를 입력해주세요"
                                    value={formInputs.detailAddr}
                                    onChange={(e) => handleInputChange('detailAddr', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 대표 서비스 & 연락처 */}
                        <div className="company_form_grid">
                            <div className="company_form_group">
                                <span>대표 서비스</span>
                                <select 
                                    className="form_select"
                                    value={formInputs.mainService}
                                    onChange={(e) => handleInputChange('mainService', e.target.value)}
                                >
                                    <option value="">선택해주세요</option>
                                    <option value="돌봄">돌봄</option>
                                    <option value="산책">산책</option>
                                    <option value="미용">미용</option>
                                    <option value="병원">병원</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>
                            <div className="company_form_group">
                                <span>연락처</span>
                                <div className="tel_input_group">
                                    <input
                                        type="tel"
                                        className="tel_form_input"
                                        maxLength={4}
                                        value={formInputs.phone1}
                                        onChange={handleTelFirstInput}
                                    />
                                    -
                                    <input 
                                        type="tel"
                                        className="tel_form_input"
                                        maxLength={4}
                                        value={formInputs.phone2}
                                        onChange={handleTelSecondInput}
                                        ref={telSecondRef}
                                    />
                                    -
                                    <input 
                                        type="tel"
                                        className="tel_form_input"
                                        maxLength={4}
                                        value={formInputs.phone3}
                                        onChange={handleTelThirdInput}
                                        ref={telThirdRef}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 제공 서비스 */}
                        <div className="company_form_section">
                            <span>제공 서비스</span>
                            <div className="company_checkbox_group">
                                <label>
                                    <input 
                                        type="checkbox"
                                        name="전체"
                                        checked={checkService.전체} 
                                        onChange={handleAllServiceChange}
                                    />
                                    전체
                                </label>

                                {serviceCategories.map((service) => (
                                    <label key={service}>
                                        <input 
                                            type="checkbox"
                                            name={service}
                                            checked={checkService[service]}
                                            onChange={handleServiceChange}
                                        />
                                        {service}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 운영 시간 */}
                        <div className="company_form_section">
                                <span>운영시간</span>
                                <label>
                                    <input 
                                        type="checkbox"
                                        checked={allDay} 
                                        onChange={handleAllTimeChange}
                                    /> 
                                    24시간 운영
                                </label>

                                {days.map(day => {
                                    const dayState = time?.[day] ?? { open: "", close: "", closed: false };
                                    const { open, close, closed } = dayState;
                                    const disabled = allDay || closed;
                                    return(
                                        <div key={day}>
                                            {day}
                                            <input 
                                                type="time"
                                                value={open}
                                                onChange={(e) => handleTimeChange(day, "open", e.target.value)}
                                                disabled={disabled}
                                            />
                                             ~
                                            <input 
                                                type="time"
                                                value={close}
                                                onChange={(e) => handleTimeChange(day, "close", e.target.value)}
                                                disabled={disabled}
                                            />
                                            <label>
                                                <input 
                                                    type="checkbox"
                                                    checked={closed}
                                                    onChange={(e) => handleClosedChange(day, e.target.checked)}
                                                    disabled={allDay}
                                                />
                                                휴무
                                            </label>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* 업체 사진 */}
                        <div className="company_form_section">
                            <span>업체 사진</span>
                            <div className="image_upload_viewer">
                                <div className="simple_upload_area">
                            <ImageUploadViewer
                                ref={companyImageRef}
                                imageTypeCode="03"
                                referenceId={formInputs.businessNumber || formInputs.ssnFirst}
                                mode="multiple"
                                files={files}
                                setFiles={setFiles}
                                isEditMode={isEditMode}
                            />
                          </div>
                         </div>
                        </div>

                        {/* 업체 소개 */}
                        <div className="company_form_section">
                            <span>업체 소개</span>
                                <textarea 
                                    className="company_form_textarea"
                                    placeholder="업체 소개글을 작성해주세요"
                                    rows={4}
                                    value={formInputs.introduction}
                                    onChange={(e) => handleInputChange('introduction', e.target.value)}
                                />                           
                        </div>
                        
                        {/* 버튼 영역 */}
                        <div className="company_form_btn">
                            <button type="button" className="cancel_btn" onClick={handleCompanyRegisterCancleBtnClick}>취소</button>
                            <button type="submit" className="submit_btn" onClick={handleCompanySubmitBtnClick}>
                                {isEditMode ? "수정" : "등록"}
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* 지도 모달 */}
            <MapModal
                show={showMapModal}
                onClose={handleCloseMapModal}
                onLocationSelect={handleLocationSelect}
            />
        </div>
    );
}

export default CompanyRegisterPage;