import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest, fetchMe } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { ImageUploadViewer } from "../../util/ImageUtil";
import { motion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import Lottie from "lottie-react";
import successAnim from "../../assets/lottie/success.json";
import "./UserProfilePage.css";

export default function UserProfilePage() {
    const nav = useNavigate();
    const { user, hydrateMe, currentMode } = useAuth();
    const [searchParams] = useSearchParams();
    const profileImageRef = useRef(null);
    const certImageRef = useRef(null);

    // 현재 사용자 역할 정규화 (먼저 계산)
    const normalizeRole = (val) => {
        let r = String(val ?? "1").trim();
        if ((r.startsWith('"') && r.endsWith('"')) || (r.startsWith("'") && r.endsWith("'"))) {
            r = r.slice(1, -1).trim();
        }
        return ["1", "2", "3", "4", "9"].includes(r) ? r : "1";
    };

    const currentRole = normalizeRole(user?.role);

    // 모드 결정: Role 4인 경우 currentMode 우선, 아니면 URL 파라미터 사용
    const urlMode = searchParams.get("mode") || "owner";
    const mode = currentRole === "4" ? currentMode : urlMode;
    const isPetmateMode = mode === "petmate";

    const isEditMode = (currentRole === "2" && !isPetmateMode) ||
        (currentRole === "3" && isPetmateMode) ||
        (currentRole === "4");

    // 폼 상태
    const [form, setForm] = useState({
        email: "",
        provider: "",
        name: "",
        nickName: "",
        phone: "",
        gender: "",
        age: "",
        birthDate: "",
        agree: false,
    });

    // 프로필 이미지 (모든 역할 - ImageUploadViewer 통일)
    const [profileFiles, setProfileFiles] = useState([]);
    const [certFiles, setCertFiles] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [doneOpen, setDoneOpen] = useState(false);

    // 나이 계산
    const calcAge = (birthDateStr) => {
        if (!birthDateStr) return "";
        const birth = new Date(birthDateStr);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    // 소셜로그인 정보 자동 매핑
    useEffect(() => {
        (async () => {
            const u = await fetchMe({ silent: true });
            if (!u) return;

            setForm((f) => ({
                ...f,
                email: u.email || "",
                provider: (u.provider || "OAUTH2").toUpperCase(),
                name: u.name || u.nickname || u.email || "",
                nickName: u.nickName || u.nickname || "",
                phone: u.phone || "",
                gender: u.gender || "",
                age: u.birthDate ? calcAge(u.birthDate) : "",
                birthDate: u.birthDate || "",
            }));

            // 프로필사진은 ImageUploadViewer가 자동으로 로드함
            // (소셜 이미지는 OAuth2 시점에 이미 저장됨)
        })();
    }, [isPetmateMode, currentMode]);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    };

    // 프로필 이미지 핸들링 (ImageUploadViewer가 처리)

    // 검증
    const validate = () => {
        if (!form.name.trim()) return "이름을 입력하세요.";
        if (!form.gender) return "성별을 선택하세요.";

        const minAge = isPetmateMode ? 18 : 14;
        if (!form.age || Number(form.age) < minAge) {
            return `나이는 ${minAge}세 이상 입력하세요.`;
        }

        if (!form.agree) return "약관에 동의해야 합니다.";
        if (!form.email) return "이메일 정보를 불러오지 못했습니다. 다시 로그인하세요.";
        if (!form.provider) return "Provider가 비어 있습니다.";

        // 펫메이트 추가 검증
        if (isPetmateMode) {
            if (!form.nickName.trim()) return "닉네임을 입력하세요.";
            if (!form.phone.trim()) return "휴대폰번호를 입력하세요.";
        }

        return null;
    };

    // 제출
    const onSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) return alert(err);

        try {
            setSubmitting(true);

            // 이미지 업로드 처리 (모든 역할)
            if (profileImageRef.current && profileImageRef.current.hasFiles) {
                await profileImageRef.current.handleUpload();
            }

            // 자격증 업로드 (펫메이트만)
            if (isPetmateMode && certImageRef.current && certImageRef.current.hasFiles) {
                await certImageRef.current.handleUpload();
            }

            const fd = new FormData();
            fd.append("email", form.email);
            fd.append("provider", form.provider);
            fd.append("name", form.name.trim());
            fd.append("gender", form.gender);
            fd.append("age", String(form.age));

            // 역할 설정
            let targetRole = isPetmateMode ? "3" : "2";
            if (currentRole === "2" && isPetmateMode) targetRole = "4"; // 반려인 -> 반려인/펫메이트
            if (currentRole === "3" && !isPetmateMode) targetRole = "4"; // 펫메이트 -> 반려인/펫메이트
            fd.append("targetRole", targetRole);

            // 펫메이트 추가 필드
            // if (isPetmateMode) {
                fd.append("nickName", form.nickName.trim());
                fd.append("phone", form.phone.trim());
            // }

            // 통합 API 엔드포인트 사용
            await apiRequest.post("/user/profile/apply", fd);

            await hydrateMe();
            setDoneOpen(true);
        } catch (e2) {
            console.error("apply error:", e2?.response?.status, e2?.response?.data, e2);
            alert(`신청 중 오류가 발생했습니다. (${e2?.response?.status ?? "알수없음"})`);
        } finally {
            setSubmitting(false);
        }
    };

    // 제목 및 부제목 결정
    const getTitle = () => {
        if (isPetmateMode) {
            if (currentRole === "3" || currentRole === "4") return "펫메이트 정보 수정";
            if (currentRole === "2") return "펫메이트 되기";
            return "펫메이트 되기";
        } else {
            if (currentRole === "2" || currentRole === "4") return "반려인 정보 수정";
            if (currentRole === "3") return "반려인 되기";
            return "반려인 되기";
        }
    };

    const getSubtitle = () => {
        if (isPetmateMode) {
            return isEditMode ? "펫메이트 정보를 수정하세요" : "반려동물과 함께하는 특별한 여정을 시작하세요";
        } else {
            return isEditMode ? "반려인 정보를 수정하세요" : "반려동물과의 일상을 더 편하게 시작하세요";
        }
    };

    const getSuccessMessage = () => {
        if (isPetmateMode) {
            return currentRole === "2" ? "이제 반려인이면서 펫메이트입니다!" : "펫메이트 등록이 완료되었습니다!";
        } else {
            return currentRole === "3" ? "이제 펫메이트이면서 반려인입니다!" : "반려인 등록이 완료되었습니다!";
        }
    };

    const getSuccessRedirect = () => {
        if (isPetmateMode) {
            return [
                { label: "업체 등록하기", path: "/companyregister" },
                { label: "건너뛰기", path: "/home" }
            ];
        } else {
            return [
                { label: "펫 등록하기", path: "/pets" },
                { label: "건너뛰기", path: "/home" }
            ];
        }
    };

    return (
        <article className="user-profile-container">
            <div className="user-profile-header">
                <h1 className="user-profile-title">{getTitle()}</h1>
                <p className="user-profile-subtitle">{getSubtitle()}</p>
                <div className="user-profile-note">
                    소셜 로그인 정보를 불러옵니다. 필요 시 수정하세요.
                </div>
            </div>

            <form onSubmit={onSubmit} className="user-profile-form">
                <input type="hidden" name="provider" value={form.provider} />

                {/* 기본 정보 섹션 */}
                <section className="form-section">
                    <h3 className="section-title">기본 정보</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">이름</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={onChange}
                                placeholder="이름을 입력하세요"
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">닉네임</label>
                            <input
                                name="nickName"
                                value={form.nickName}
                                onChange={onChange}
                                placeholder="닉네임을 입력하세요"
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">휴대폰</label>
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={onChange}
                                placeholder="예: 010-1234-5678"
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">성별</label>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={onChange}
                                className="form-select"
                                required
                            >
                                <option value="">선택하세요</option>
                                <option value="M">남성</option>
                                <option value="F">여성</option>
                                <option value="N">기타</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">나이</label>
                            <input
                                type="number"
                                name="age"
                                min={isPetmateMode ? 18 : 14}
                                value={form.age}
                                onChange={onChange}
                                placeholder={`예: 28 (최소 ${isPetmateMode ? 18 : 14}세)`}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">{/* 자리맞춤 */}</div>
                    </div>

                    {/* 프로필 사진 - 통일된 ImageUploadViewer */}
                    <div className="form-group">
                        <label className="form-label">프로필 사진</label>
                        <ImageUploadViewer
                            ref={profileImageRef}
                            className="profile-upload"
                            imageTypeCode={isPetmateMode ? "06" : "01"}
                            referenceId={form.email}
                            mode="single"
                            files={profileFiles}
                            setFiles={setProfileFiles}
                            isEditMode={true}
                        />
                    </div>
                </section>

                {/* 펫메이트 전용: 자격증 섹션 */}
                {isPetmateMode && (
                    <section className="form-section">
                        <h3 className="section-title">자격증 및 증빙서류</h3>
                        <div className="form-group">
                            <label className="form-label">자격증 업로드</label>
                            <ImageUploadViewer
                                ref={certImageRef}
                                className="cert-upload"
                                imageTypeCode="05"
                                referenceId={form.email}
                                mode="multiple"
                                files={certFiles}
                                setFiles={setCertFiles}
                                isEditMode={true}
                            />
                        </div>
                    </section>
                )}

                {/* 약관 동의 */}
                <section className="form-section">
                    <label className="form-check agreement">
                        <input
                            type="checkbox"
                            name="agree"
                            checked={form.agree}
                            onChange={onChange}
                            required
                        />
                        <span className="checkmark"></span>
                        <span className="agreement-text">
                            <strong>서비스 약관 및 개인정보 처리방침</strong>에 동의합니다.
                        </span>
                    </label>
                </section>

                {/* 버튼 */}
                <div className="form-actions">
                    <button type="submit" disabled={submitting} className="btn-primary">
                        {submitting ? (
                            <>
                                <span className="loading-spinner"></span>
                                {isEditMode ? "수정" : "등록"} 중...
                            </>
                        ) : (
                            `${isPetmateMode ? "펫메이트" : "반려인"} ${isEditMode ? "정보 수정" : "신청하기"}`
                        )}
                    </button>
                    <button type="button" onClick={() => nav(-1)} className="btn-secondary">
                        취소
                    </button>
                </div>
            </form>

            {/* 성공 모달 */}
            <Dialog.Root open={doneOpen} onOpenChange={setDoneOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="radix-overlay" />
                    <Dialog.Content className="radix-content">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            <div className="modal-icon">
                                <Lottie
                                    animationData={successAnim}
                                    loop={false}
                                    speed={1.5}
                                    style={{ width: 200, height: 200, margin: "0 auto" }}
                                />
                            </div>
                            <Dialog.Title className="modal-title">축하합니다!</Dialog.Title>
                            <Dialog.Description className="modal-desc">
                                {getSuccessMessage()}
                                <br />
                                {isPetmateMode ? "소속된 업체를 등록하시겠습니까?" : "펫을 등록하시겠습니까?"}
                            </Dialog.Description>

                            <div className="modal-actions">
                                {getSuccessRedirect().map((action, idx) => (
                                    <button
                                        key={idx}
                                        className={idx === 0 ? "btn-primary" : "btn-secondary"}
                                        onClick={() => nav(action.path, { replace: true })}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </article>
    );
}