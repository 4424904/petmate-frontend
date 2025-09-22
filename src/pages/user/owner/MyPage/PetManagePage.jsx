// src/pages/member/pet/PetManagePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Calendar, Heart } from 'lucide-react';
import './PetManagePage.css';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiRequest } from '../../../../services/api';
import Lottie from 'lottie-react';
import petAnim from '../../../../assets/lottie/pet.json';

const API_BASE = process.env.REACT_APP_SPRING_API_BASE || 'http://localhost:8090';
const isHttp = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);

// 이미지 표시용 URL 변환
const getPetImageUrl = (s) => {
  if (!s) return null;
  if (s.startsWith('http')) return s;
  if (s.startsWith('/api/files/view')) return `${API_BASE}${s}`;
  return `${API_BASE}/api/files/view?filePath=${encodeURIComponent(s)}`;
};

// 품종 id → name 변환
async function resolveBreedName(breedId, species) {
  if (!breedId) return '';
  const { data } = await apiRequest.get('/pet/breeds', { params: { species } });
  const list = Array.isArray(data) ? data : [];
  const hit = list.find((b) => Number(b.id) === Number(breedId));
  return hit ? hit.name : '';
}

const PetManagePage = () => {
  const { user, isLogined } = useAuth();
  const [pets, setPets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isLogined) loadMyPets(); }, [isLogined]);

  const loadMyPets = async () => {
    try {
      setLoading(true);
      const { data } = await apiRequest.get('/pet/my');
      setPets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('펫 목록 로드 실패:', e);
      setPets([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const on = showAddModal || !!editingPet;
    document.body.classList.toggle('modal-open', on);
    return () => document.body.classList.remove('modal-open');
  }, [showAddModal, editingPet]);

  const handleDeletePet = async (petId) => {
    if (!petId || !window.confirm('이 반려동물을 삭제할까요?')) return;
    try {
      setLoading(true);
      await apiRequest.delete(`/pet/${petId}`);
      setPets((prev) => prev.filter((p) => p.id !== petId));
      alert('삭제되었습니다.');
    } catch (e) {
      console.error('삭제 실패:', e);
      alert(`삭제 실패: ${e?.response?.data?.message || e?.message || '알 수 없는 오류'}`);
    } finally { setLoading(false); }
  };

  const handleAddPet = async (petData) => {
    if (!isLogined || !user) return alert('로그인이 필요합니다.');
    try {
      setLoading(true);
      const { data: savedPet } = await apiRequest.post('/pet/apply', petData);
      const nameById = petData.breedName || (await resolveBreedName(savedPet.breedId, savedPet.species));
      setPets((prev) => [...prev, { ...savedPet, breedName: nameById }]);
      setShowAddModal(false);
      alert('반려동물이 성공적으로 등록되었습니다.');
      return savedPet;
    } catch (error) {
      console.error('펫 등록 실패:', error);
      alert(`펫 등록 실패: ${error?.response?.data?.message || error?.message || '알 수 없는 오류'}`);
    } finally { setLoading(false); }
  };

  const handleEditPet = async (petData) => {
    try {
      setLoading(true);
      const { data: updated } = await apiRequest.put(`/pet/${editingPet.id}`, petData);
      const nameById = petData.breedName || (await resolveBreedName(updated.breedId, updated.species));
      setPets((prev) => prev.map((p) => (p.id === editingPet.id ? { ...updated, breedName: nameById } : p)));
      setEditingPet(null);
      alert('반려동물이 수정되었습니다.');
      return updated;
    } catch (error) {
      console.error('펫 수정 실패:', error);
      alert(`펫 수정 실패: ${error?.response?.data?.message || error?.message || '알 수 없는 오류'}`);
    } finally { setLoading(false); }
  };

  const getSpeciesText = (s) =>
    ({ D: '강아지', C: '고양이', R: '토끼', S: '설치류', H: '말', B: '새', P: '파충류', F: '가축동물', O: '기타' }[s] || s);
  const getGenderText = (g) => (g === 'M' ? '수컷' : '암컷');
  const formatDate = (s) => (s ? new Date(s).toLocaleDateString('ko-KR') : '');

  if (!isLogined) {
    return (
      <div className="pet-manage-page">
        <div className="pet-manage-container">
          <div className="pet-manage-empty">
            <Heart size={64} className="pet-manage-empty-icon" />
            <h3 className="pet-manage-empty-title">로그인이 필요합니다</h3>
            <p className="pet-manage-empty-desc">반려동물 관리를 위해 로그인해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pet-manage-page">
      <div className="pet-manage-container">
        <div className="pet-manage-header">
          <div className="pet-manage-header-wrapper">
            <div className="pet-manage-header-lottie">
              <Lottie animationData={petAnim} loop style={{ width: 300, height: 300 }} />
            </div>
          </div>
          <div className="pet-manage-header-info">
            <h1 className="pet-manage-title">내 반려동물 관리</h1>
            <p className="pet-manage-subtitle">등록된 반려동물: {pets.length}마리</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="pet-manage-add-btn">
            <Plus size={20} /> 반려동물 등록
          </button>
        </div>

        {pets.length === 0 ? (
          <div className="pet-manage-empty">
            <Heart size={64} className="pet-manage-empty-icon" />
            <h3 className="pet-manage-empty-title">등록된 반려동물이 없습니다</h3>
            <p className="pet-manage-empty-desc">첫 번째 반려동물을 등록해보세요!</p>
          </div>
        ) : (
          <div className="pet-manage-grid">
            {pets.map((pet) => (
              <div key={pet.id} className="pet-card">
                <div className="pet-card-image-container">
                  <img
                    src={getPetImageUrl(pet.imageUrl) || '/api/placeholder/300/200'}
                    alt={pet.name}
                    className="pet-card-image"
                    onError={(e) => { e.currentTarget.src = '/api/placeholder/300/200'; }}
                  />
                  <div className="pet-card-actions">
                    <button onClick={() => setEditingPet(pet)} className="pet-card-action-btn pet-card-edit-btn">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeletePet(pet.id)} className="pet-card-action-btn pet-card-delete-btn">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="pet-card-content">
                  <div className="pet-card-header">
                    <h3 className="pet-card-name">{pet.name}</h3>
                    <span className="pet-card-species">{getSpeciesText(pet.species)}</span>
                  </div>

                  <div className="pet-card-info">
                    <div className="pet-card-info-row"><span>품종:</span><span className="pet-card-info-value">{pet.breedName}</span></div>
                    <div className="pet-card-info-row"><span>나이:</span><span className="pet-card-info-value">{pet.ageYear}살</span></div>
                    <div className="pet-card-info-row"><span>성별:</span><span className="pet-card-info-value">{getGenderText(pet.gender)}</span></div>
                    <div className="pet-card-info-row"><span>체중:</span><span className="pet-card-info-value">{pet.weightKg}kg</span></div>
                    <div className="pet-card-info-row"><span>중성화:</span><span className="pet-card-info-value">{pet.neutered ? '완료' : '미완료'}</span></div>
                  </div>

                  {pet.temper && (
                    <div className="pet-card-temper">
                      <div className="pet-card-temper-label">성격</div>
                      <div className="pet-card-temper-value">{pet.temper}</div>
                    </div>
                  )}

                  {pet.note && (
                    <div className="pet-card-note">
                      <div className="pet-card-note-label">특이사항</div>
                      <p className="pet-card-note-text">{pet.note}</p>
                    </div>
                  )}

                  <div className="pet-card-date">
                    <Calendar size={12} /> 등록일: {formatDate(pet.createdAt || pet.regAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(showAddModal || editingPet) && (
          <PetModal
            pet={editingPet}
            loading={loading}
            onSave={editingPet ? handleEditPet : handleAddPet}
            onClose={() => { setShowAddModal(false); setEditingPet(null); }}
            onAfterImage={(updated) => {
              if (!updated?.id) return;
              setPets((prev) => {
                const i = prev.findIndex((x) => x.id === updated.id);
                if (i < 0) return prev;
                const copy = [...prev];
                copy[i] = { ...copy[i], imageUrl: updated.imageUrl }; // 키 저장
                return copy;
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

/* ------------------------- 업로더 (imageTypeCode = "02") ------------------------- */
const PetImageUploader = React.forwardRef(({ petId, className = '' }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError('');
    if (f && !f.type.startsWith('image/')) {
      setFile(null);
      setError('이미지 파일만 업로드 가능합니다.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setFile(null);
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setFile(f);
    setError('');
  };

  const handleDragOver = (e) => e.preventDefault();
  const removeFile = () => setFile(null);

  const upload = async (idOverride) => {
    const targetId = idOverride ?? petId;
    if (!targetId) throw new Error('펫 ID가 필요합니다.');
    if (!file) throw new Error('업로드할 파일을 선택하세요.');
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('imageTypeCode', '02');           // ← 짧은 코드(펫 이미지)
      fd.append('referenceId', String(targetId));
      fd.append('isThumbnail', 'true');

      const { data } = await apiRequest.post('/api/files/upload/single', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const key = data?.filePath; // 예: pets/40/uuid.png
      if (!key) throw new Error('filePath 누락');

      await apiRequest.patch(`/pet/${targetId}/image`, { imageUrl: key });

      return { id: Number(targetId), imageUrl: key };
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '업로드 실패';
      setError(msg);
      throw e;
    } finally { setUploading(false); }
  };

  React.useImperativeHandle(ref, () => ({
    upload: (id) => upload(id),
    hasFile: () => !!file,
    clear: () => setFile(null),
    isUploading: () => uploading,
  }));

  return (
    <div className={`pet-image-uploader ${className}`}>
      <div className="pet-uploader-label">
        대표 이미지
        <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
          (Pet ID: {petId || 'N/A'})
        </span>
      </div>

      <div
        className="pet-upload-area"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="upload-icon">📷</div>
        <p>이미지를 드래그하거나 클릭하여 선택</p>
        <small>JPG, PNG, WEBP 권장</small>
      </div>

      {file && (
        <div className="selected-files-preview">
          <div className="selected-files-label">선택된 파일</div>
          <div className="selected-files-grid">
            <div className="selected-file-item">
              <img src={URL.createObjectURL(file)} alt={file.name} className="selected-file-thumb" />
              <button type="button" className="remove-file-btn" onClick={removeFile} title="파일 제거">✕</button>
              <div className="file-name">{file.name}</div>
            </div>
          </div>
          <p className="upload-note">등록/수정 버튼 클릭 시 업로드됩니다.</p>
        </div>
      )}

      {error && <div className="pet-uploader-error">{error}</div>}
      {uploading && <div className="pet-uploader-loading">이미지 업로드 중...</div>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
});

/* ------------------------- Modal ------------------------- */
const PetModal = ({ pet, loading, onSave, onClose, onAfterImage }) => {
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    species: 'D',
    breedId: '',
    breedName: '',
    gender: 'M',
    ageYear: '',
    weightKg: '',
    neutered: 0,
    temper: '',
    note: '',
  });

  const [filteredBreeds, setFilteredBreeds] = useState([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [openSuggest, setOpenSuggest] = useState(false);

  const imageUploaderRef = useRef(null);
  const [petId, setPetId] = useState(pet?.id || null);

  const norm = (s) => s?.trim().toLowerCase();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.suggest-wrap')) setOpenSuggest(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name || '',
        imageUrl: isHttp(pet.imageUrl) || (pet.imageUrl || '').startsWith('/api/files/view') ? pet.imageUrl : '',
        species: pet.species || 'D',
        breedId: pet.breedId || '',
        breedName: pet.breedName || '',
        gender: pet.gender || 'M',
        ageYear: pet.ageYear || '',
        weightKg: pet.weightKg || '',
        neutered: pet.neutered || 0,
        temper: pet.temper || '',
        note: pet.note || '',
      });
      setSearch(pet.breedName || '');
      setPetId(pet.id || null);
    } else {
      setPetId(null);
      setFormData({
        name: '',
        imageUrl: '',
        species: 'D',
        breedId: '',
        breedName: '',
        gender: 'M',
        ageYear: '',
        weightKg: '',
        neutered: 0,
        temper: '',
        note: '',
      });
      setSearch('');
    }
  }, [pet]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data } = await apiRequest.get('/pet/breeds', { params: { species: formData.species } });
        if (!ignore) setFilteredBreeds(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) setFilteredBreeds([]);
      }
    })();
    return () => { ignore = true; };
  }, [formData.species]);

  const resolveBreedId = (name, list) => {
    const n = norm(name);
    return (list.find((b) => norm(b.name) === n) || {}).id || '';
  };

  const handleBreedFocus = () => { setOpenSuggest(true); setSuggestions(filteredBreeds); };

  const handleBreedInput = (e) => {
    const value = e.target.value.trim();
    setSearch(value);
    const hit = filteredBreeds.find((b) => norm(b.name) === norm(value));
    setFormData((p) => ({ ...p, breedName: value, breedId: hit ? hit.id : '' }));

    if (!value) return setSuggestions(filteredBreeds);

    const chosungMap = {
      ㄱ: /^[가-깋]/, ㄴ: /^[나-닣]/, ㄷ: /^[다-딯]/, ㄹ: /^[라-맇]/,
      ㅁ: /^[마-밓]/, ㅂ: /^[바-빟]/, ㅅ: /^[사-싷]/, ㅇ: /^[아-잏]/,
      ㅈ: /^[자-짛]/, ㅊ: /^[차-칳]/, ㅋ: /^[카-킿]/, ㅌ: /^[타-팋]/,
      ㅍ: /^[파-핗]/, ㅎ: /^[하-힣]/,
    };
    const rx = chosungMap[value];
    const list = rx
      ? filteredBreeds.filter((b) => rx.test(b.name))
      : filteredBreeds.filter((b) => b.name.toLowerCase().includes(value.toLowerCase()));
    setSuggestions(list);
  };

  const selectBreed = (b) => {
    setFormData((prev) => ({ ...prev, breedId: b.id, breedName: b.name }));
    setSearch(b.name);
    setSuggestions([]);
    setOpenSuggest(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!formData.name.trim()) return alert('펫 이름을 입력해주세요.');
    const resolved = formData.breedId || resolveBreedId(formData.breedName || search, filteredBreeds);
    if (!resolved) return alert('품종을 선택해주세요.');

    try {
      const saved = await onSave({
        ...formData,
        breedId: Number(resolved),
        ageYear: +formData.ageYear || 0,
        weightKg: +formData.weightKg || 0,
        neutered: +formData.neutered,
      });

      const savedPetId = saved?.id ?? pet?.id;
      if (!savedPetId) throw new Error('펫 ID를 가져올 수 없습니다.');
      setPetId(savedPetId);

      const uploader = imageUploaderRef.current;
      if (uploader?.hasFile?.()) {
        const updated = await uploader.upload(savedPetId);
        onAfterImage?.(updated);
        uploader.clear?.();
      }

      onClose();
    } catch (err) {
      console.error('펫 저장 실패:', err);
      alert(`저장 실패: ${err?.response?.data?.message || err?.message || '펫 저장에 실패했습니다.'}`);
    }
  };

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [nameFrom(e)]: e.target.value }));
  const nameFrom = (e) => e.target.name;

  return (
    <div className="pet-modal-overlay">
      <div className="pet-modal">
        <div className="pet-modal-header">
          <h2 className="pet-modal-title">{pet ? '반려동물 정보 수정' : '새 반려동물 등록'}</h2>
        </div>

        <div className="pet-modal-content">
          <div className="pet-form-grid">
            <div className="pet-form-group">
              <label className="pet-form-label">이름 *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                     className="pet-form-input" placeholder="반려동물 이름" required />
            </div>

            <div className="pet-form-group">
              <label className="pet-form-label">동물 종류 *</label>
              <select name="species" value={formData.species} onChange={handleChange} className="pet-form-select">
                <option value="D">강아지</option><option value="C">고양이</option><option value="R">토끼</option>
                <option value="S">설치류</option><option value="H">말</option><option value="B">새</option>
                <option value="P">파충류</option><option value="F">가축동물</option><option value="O">기타</option>
              </select>
            </div>

            <div className="pet-form-group">
              <label className="pet-form-label">품종 *</label>
              <div className="suggest-wrap">
                <input type="text" value={search} onFocus={handleBreedFocus} onChange={handleBreedInput}
                       className="pet-form-input" placeholder="품종 입력" required />
                {openSuggest && suggestions.length > 0 && (
                  <ul className="breed-suggestions">
                    {suggestions.map((b) => (<li key={b.id} onClick={() => selectBreed(b)}>{b.name}</li>))}
                  </ul>
                )}
              </div>
            </div>

            <div className="pet-form-group">
              <label className="pet-form-label">성별 *</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="pet-form-select">
                <option value="M">수컷</option><option value="F">암컷</option>
              </select>
            </div>

            <div className="pet-form-group">
              <label className="pet-form-label">나이 (년)</label>
              <input type="number" step="0.1" name="ageYear" value={formData.ageYear} onChange={handleChange}
                     className="pet-form-input" placeholder="3.5" min="0" max="30" />
            </div>

            <div className="pet-form-group">
              <label className="pet-form-label">체중 (kg)</label>
              <input type="number" step="0.1" name="weightKg" value={formData.weightKg} onChange={handleChange}
                     className="pet-form-input" placeholder="5.2" min="0" />
            </div>
          </div>

          <PetImageUploader ref={imageUploaderRef} petId={petId} className="pet-modal-image-upload" />

          <div className="pet-form-group">
            <label className="pet-form-label">중성화 여부</label>
            <select name="neutered" value={formData.neutered} onChange={handleChange} className="pet-form-select">
              <option value={0}>미완료</option><option value={1}>완료</option>
            </select>
          </div>

          <div className="pet-form-group">
            <label className="pet-form-label">성격</label>
            <input type="text" name="temper" value={formData.temper} onChange={handleChange}
                   className="pet-form-input" placeholder="활발함, 온순함 등" />
          </div>

          <div className="pet-form-group">
            <label className="pet-form-label">특이사항</label>
            <textarea name="note" value={formData.note} onChange={handleChange} rows={4}
                      className="pet-form-textarea" placeholder="알레르기, 질병 이력 등" />
          </div>

          <div className="pet-modal-actions">
            <button type="button" onClick={onClose} className="pet-modal-btn pet-modal-cancel-btn">취소</button>
            <button type="button" onClick={handleSubmit} className="pet-modal-btn pet-modal-submit-btn" disabled={loading}>
              {loading ? '처리 중...' : (pet ? '수정하기' : '등록하기')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetManagePage;
