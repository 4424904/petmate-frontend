import React, { useState } from 'react';
// import axios from 'axios';
import { apiRequest } from '../services/api';
import './ImageUtil.css';

const FILE_API_BASE_URL = `${process.env.REACT_APP_SPRING_API_BASE || 'http://localhost:8090'}/api/files`;

// S3 이미지 URL 생성 헬퍼 함수
const getImageUrl = (imageData) => {
    if (!imageData) return null;

    // 문자열인 경우 (기존 호환성)
    if (typeof imageData === 'string') {
        // 이미 완전한 URL인 경우 그대로 반환
        if (imageData.startsWith('http')) return imageData;
        // S3 키인 경우는 사용할 수 없으므로 null 반환 (백엔드에서 imageUrl 제공해야 함)
        return null;
    }

    // 객체인 경우 imageUrl 우선 사용, 없으면 filePath 확인
    if (typeof imageData === 'object') {
        console.log('🔍 [getImageUrl] imageData:', imageData); // 디버깅용

        if (imageData.imageUrl && imageData.imageUrl.startsWith('http')) {
            console.log('✅ [getImageUrl] Using imageUrl:', imageData.imageUrl);
            return imageData.imageUrl;
        }
        if (imageData.filePath && imageData.filePath.startsWith('http')) {
            console.log('✅ [getImageUrl] Using filePath:', imageData.filePath);
            return imageData.filePath;
        }
        // S3 키는 사용할 수 없음
        console.log('❌ [getImageUrl] No valid URL found, imageData:', imageData);
        return null;
    }

    return null;
};


// ====== 이미지 조회 기능 ======

// 단일 이미지 조회
export const fetchSingleImage = async (filePath) => {
    try {
        const response = await apiRequest.get(`${FILE_API_BASE_URL}/view`, {
            params: { filePath }
        });
        return response.data;
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message || '조회 실패');
    }
};

// 참조 기준 다중 이미지 조회
export const fetchImagesByReference = async (imageTypeCode, referenceId) => {
    try {
        const response = await apiRequest.get(`${FILE_API_BASE_URL}/list`, {
            params: { imageTypeCode, referenceId }
        });
        return response.data;
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message || '조회 실패');
    }
};

// 사용자 프로필 이미지 조회 (반려인: 01, 펫메이트: 06)
export const fetchUserProfileImage = async (userId, userRole, currentMode = null) => {
    try {
        console.log('🔍 [fetchUserProfileImage] 호출됨:', { userId, userRole, currentMode });

        // 사용자 역할에 따른 ImageType 결정
        let imageTypeCode;

        // Role 4 (양쪽 역할)인 경우 현재 모드에 따라 결정
        if (userRole === "4" || userRole === 4) {
            imageTypeCode = currentMode === "petmate" ? "06" : "01";
        }
        // Role 3 (펫메이트)
        else if (userRole === "3" || userRole === 3) {
            imageTypeCode = "06";
        }
        // Role 2 (반려인) 또는 기타
        else {
            imageTypeCode = "01";
        }

        console.log('🔍 [fetchUserProfileImage] 결정된 imageTypeCode:', imageTypeCode);

        const response = await fetchImagesByReference(imageTypeCode, userId);
        console.log('🔍 [fetchUserProfileImage] API 응답:', response);

        if (response.success && response.images && response.images.length > 0) {
            // 첫 번째 이미지 또는 썸네일 이미지 반환
            const thumbnailImage = response.images.find(img => img.isThumbnail);
            const profileImage = thumbnailImage || response.images[0];
            console.log('🔍 [fetchUserProfileImage] 선택된 이미지:', profileImage);

            const imageUrl = getImageUrl(profileImage);
            console.log('🔍 [fetchUserProfileImage] 최종 URL:', imageUrl);
            return imageUrl;
        }

        console.log('🔍 [fetchUserProfileImage] 이미지 없음 - null 반환');
        return null;
    } catch (err) {
        console.warn('❌ [fetchUserProfileImage] 프로필 이미지 조회 실패:', err.message);
        return null;
    }
};

// ====== 이미지 뷰어 컴포넌트 ======

// 가로 슬라이드 이미지 뷰어
export const ImageSlider = ({
    images = [],
    className = '',
    showDots = true,
    showArrows = true,
    autoSlide = false,
    slideInterval = 3000,
    onImageClick = () => {},
    loading = false,
    errorMessage = '',
    emptyMessage = '이미지가 없습니다.'
}) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = React.useState(autoSlide);
    const intervalRef = React.useRef(null);

    React.useEffect(() => {
        if (isAutoPlaying && images.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, slideInterval);
        } else {
            clearInterval(intervalRef.current);
        }

        return () => clearInterval(intervalRef.current);
    }, [isAutoPlaying, images.length, slideInterval]);

    const goToSlide = (index) => {
        setCurrentIndex(index);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handleMouseEnter = () => {
        if (autoSlide) setIsAutoPlaying(false);
    };

    const handleMouseLeave = () => {
        if (autoSlide) setIsAutoPlaying(true);
    };

    if (loading) {
        return (
            <div className={`image-slider loading ${className}`}>
                <div className="slider-loading">이미지 로딩 중...</div>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className={`image-slider error ${className}`}>
                <div className="slider-error">{errorMessage}</div>
            </div>
        );
    }

    if (!images || images.length === 0) {
        return (
            <div className={`image-slider empty ${className}`}>
                <div className="slider-empty">{emptyMessage}</div>
            </div>
        );
    }

    return (
        <div
            className={`image-slider ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="slider-container">
                {showArrows && images.length > 1 && (
                    <>
                        <button
                            className="slider-arrow prev"
                            onClick={goToPrevious}
                            aria-label="이전 이미지"
                        >
                            ‹
                        </button>
                        <button
                            className="slider-arrow next"
                            onClick={goToNext}
                            aria-label="다음 이미지"
                        >
                            ›
                        </button>
                    </>
                )}

                <div className="slider-track">
                    {images.map((image, index) => (
                        <div
                            key={index}
                            className={`slider-slide ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => onImageClick(image, index)}
                        >
                            <img
                                src={getImageUrl(image) || image.url || image}
                                alt={image.alt || `슬라이드 ${index + 1}`}
                                className="slider-image"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {showDots && images.length > 1 && (
                <div className="slider-dots">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            className={`slider-dot ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => goToSlide(index)}
                            aria-label={`${index + 1}번째 이미지로 이동`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// 조회+업로드 통합 컴포넌트 (CompanyRegisterPage 스타일 적용)
export const ImageUploadViewer = React.forwardRef(({
    imageTypeCode = '01',
    referenceId = 1,
    mode = 'single', // 'single' | 'multiple'
    onUploadSuccess = () => {},
    onUploadError = () => {},
    onViewError = () => {},
    acceptTypes = 'image/*',
    maxFileSize = 10 * 1024 * 1024,
    maxFiles = 10,
    className = '',
    emptyPlaceholder = '이미지를 업로드하려면 클릭하거나 드래그하세요',
    disabled = false,
    files,
    setFiles,
    isEditMode = false
}, ref) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = React.useRef(null);

    // 이미지 목록 조회
    const loadImages = async () => {
        setLoading(true);
        setError('');
        try {
            if (referenceId && isEditMode) {
                const response = await fetchImagesByReference(imageTypeCode, referenceId);
                if (response.success) {
                    // setFiles는 File 객체 배열용이므로 초기화
                    setFiles([]);
                    setImages(response.images || []);
                } else {
                    throw new Error(response.message || '조회 실패');
                }
            }
        } catch (err) {
            const errorMessage = err.message || '이미지 조회 실패';
            setError(errorMessage);
            onViewError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // 컴포넌트 마운트 시 이미지 로드
    React.useEffect(() => {
        loadImages();
    }, [imageTypeCode, referenceId]);

    // 파일 추가 핸들러 - 파일 선택만 (업로드는 폼 제출 시)
    const handleFiles = (newFiles) => {
        const fileArray = Array.from(newFiles);

        // 파일 크기 검증
        const oversizedFiles = fileArray.filter(file => file.size > maxFileSize);
        if (oversizedFiles.length > 0) {
            setError(`일부 파일이 ${Math.round(maxFileSize / (1024 * 1024))}MB를 초과합니다.`);
            return;
        }

        if (mode === 'single') {
            // 단일 모드: 기존 파일 대체
            setFiles(fileArray.slice(0, 1));
        } else {
            // 다중 모드: 파일 추가 (최대 개수 제한)
            setFiles(prev => {
                const combined = [...prev, ...fileArray];
                if (combined.length > maxFiles) {
                    setError(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`);
                    return combined.slice(0, maxFiles);
                }
                return combined;
            });
        }
        setError('');
    };

    // 드래그&드롭 핸들러
    const handleDrop = (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    // 클릭 업로드
    const handleClickArea = () => {
        inputRef.current?.click();
    };

    // 파일 삭제
    const handleRemoveFile = (indexToRemove) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // 업로드 실행
    const handleUpload = async () => {
        if (!files || (Array.isArray(files) ? files.length === 0 : !files)) {
            setError('파일을 선택해주세요.');
            return;
        }

        const formData = new FormData();

        if (mode === 'single') {
            // 단일 모드: 기존 이미지 교체 (replace 엔드포인트 사용)
            const fileToUpload = Array.isArray(files) ? files[0] : files;
            formData.append('files', fileToUpload);
            formData.append('setFirstAsThumbnail', true);
        } else {
            // 다중 모드: 기존 이미지에 추가 (multiple 엔드포인트 사용)
            const filesToUpload = Array.isArray(files) ? files : [files];
            filesToUpload.forEach(file => {
                formData.append('files', file);
            });
            formData.append('setFirstAsThumbnail', false);
        }

        formData.append('imageTypeCode', imageTypeCode);
        formData.append('referenceId', referenceId);

        setLoading(true);
        setError('');

        try {
            // 단일 모드는 교체(replace), 다중 모드는 추가(multiple)
            const endpoint = mode === 'single' ? '/upload/replace' : '/upload/multiple';
            const response = await apiRequest.post(`${FILE_API_BASE_URL}${endpoint}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                onUploadSuccess(response.data);
                setFiles(mode === 'single' ? null : []);
                loadImages(); // 목록 새로고침
            } else {
                throw new Error(response.data.message || '업로드 실패');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || '업로드 실패';
            setError(errorMessage);
            onUploadError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // 기존 이미지에 새 이미지 추가 (교체가 아닌 추가)
    const handleUploadAppend = async (filesToUpload = files) => {
        if (filesToUpload.length === 0) {
            setError('파일을 선택해주세요.');
            return;
        }

        const formData = new FormData();
        filesToUpload.forEach(file => {
            formData.append('files', file);
        });
        formData.append('imageTypeCode', imageTypeCode);
        formData.append('referenceId', referenceId);
        formData.append('setFirstAsThumbnail', false);

        setLoading(true);
        setError('');

        try {
            // multiple 엔드포인트 사용 (기존 이미지에 추가)
            const response = await apiRequest.post(`${FILE_API_BASE_URL}/upload/multiple`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                onUploadSuccess(response.data);
                setFiles([]);
                loadImages(); // 목록 새로고침
            } else {
                throw new Error(response.data.message || '업로드 실패');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || '업로드 실패';
            setError(errorMessage);
            onUploadError(errorMessage);
        } finally {
            setLoading(false);
        }
    };


    // 개별 이미지 삭제
    const handleDeleteImage = async (imageId) => {
        if (!imageId) return;

        const confirmDelete = window.confirm('이 이미지를 삭제하시겠습니까?');
        if (!confirmDelete) return;

        try {
            setLoading(true);
            const response = await apiRequest.delete(`${FILE_API_BASE_URL}/delete`, {
                params: { imageId }
            });

            if (response.data.success) {
                setImages(prev => prev.filter(img => img.imageId !== imageId));
                // 이미지 목록 새로고침
                loadImages();
            } else {
                throw new Error(response.data.message || '삭제 실패');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || '이미지 삭제 실패';
            setError(errorMessage);
            onUploadError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ref를 통해 외부에서 접근할 수 있는 함수들 노출
    React.useImperativeHandle(ref, () => ({
        handleUpload,
        hasFiles: Array.isArray(files) ? files.length > 0 : files !== null && files !== undefined,
        isLoading: loading,
        // 폼 제출 시에는 업로드하지 않음 (이미 관리 모드에서 개별 업로드됨)
        skipUpload: () => {
            console.log("ImageUploadViewer: 폼 제출 시 이미지 업로드 스킵 (이미 개별 업로드됨)");
        }
    }));

    return (
        <div className={`image-upload-viewer ${className}`}>
            {loading ? (
                <div className="viewer-loading">
                    이미지 로딩 중...
                </div>
            ) : error ? (
                <div className="viewer-error">
                    {error}
                    <button onClick={loadImages} className="retry-btn">
                        다시 시도
                    </button>
                </div>
            ) : (
                // 통합 이미지 관리 화면 - 간단하게!
                <div className="simple-image-manager">
                    {/* 기존 이미지들 그리드 */}
                    {images && images.length > 0 && (
                        <div className="images-grid">
                            {images.map((image, index) => (
                                <div key={image.imageId || index} className="image-grid-item">
                                    <div className="image-wrapper">
                                        <img
                                            src={getImageUrl(image)}
                                            alt={image.originalName || `이미지 ${index + 1}`}
                                            className="grid-image"
                                        />
                                        <button
                                            type="button"
                                            className="delete-image-btn"
                                            onClick={() => handleDeleteImage(image.imageId)}
                                            title="이미지 삭제"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="image-info">
                                        <span className="image-name">{image.originalName}</span>
                                        {image.isThumbnail && <span className="thumbnail-badge">썸네일</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 새 이미지 추가 영역 */}
                    <div
                        className={`simple-upload-area ${(!images || images.length === 0) ? 'empty' : ''}`}
                        onClick={handleClickArea}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <div className="upload-placeholder">
                            <div className="upload-icon">📷</div>
                            <p>{(!images || images.length === 0) ? '이미지를 드래그하거나 클릭하여 선택' : '새 이미지 추가'}</p>
                        </div>
                    </div>

                    {/* 선택된 파일들 미리보기 */}
                    {files && files.length > 0 && (
                        <div className="selected-files">
                            <h4>선택된 파일 ({files.length}개)</h4>
                            <div className="uploaded-files">
                                {files.map((file, index) => {
                                    const isFileObject = file instanceof File;
                                    const previewUrl = isFileObject ? URL.createObjectURL(file) : getImageUrl(file);
                                    const fileName = isFileObject ? file.name : (file.originalName || `파일 ${index + 1}`);

                                    return (
                                        <div key={index} className="file-item">
                                            {previewUrl && (
                                                <img
                                                    src={previewUrl}
                                                    alt={fileName}
                                                    className="file-preview"
                                                />
                                            )}
                                            <button
                                                type="button"
                                                className="file-remove-btn"
                                                onClick={() => handleRemoveFile(index)}
                                            >
                                                ✕
                                            </button>
                                            <p className="file-name">{fileName}</p>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="upload-note">등록 버튼 클릭 시 업로드됩니다.</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    <input
                        type="file"
                        accept={acceptTypes}
                        multiple={mode === 'multiple'}
                        ref={inputRef}
                        onChange={(e) => handleFiles(e.target.files)}
                        style={{ display: 'none' }}
                    />
                </div>
            )}
        </div>
    );
});

// 이미지 삭제 유틸리티
export const deleteImage = async (filePath) => {
    try {
        const response = await apiRequest.delete(`${FILE_API_BASE_URL}/delete`, {
            params: { filePath }
        });
        return response.data;
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message || '삭제 실패');
    }
};

// 기본 export
export default {
    // 조회 함수
    fetchSingleImage,
    fetchImagesByReference,
    fetchUserProfileImage,

    // 뷰어 컴포넌트
    ImageSlider,
    ImageUploadViewer,

    // 유틸리티
    deleteImage,
    getImageUrl
};

// 개별 export
export { getImageUrl };