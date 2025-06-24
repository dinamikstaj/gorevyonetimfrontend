// app/page.tsx (KOMPLE GÜNCEL KOD)

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusCircle, Edit, Trash2, User, List, Calendar, Clock } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'beklemede' | 'devam-ediyor' | 'tamamlandı';
    assignedTo: string;
    assignedBy: string;
    type: string;
    createdAt: string; // Tarih string olarak gelecek
    completedAt?: string | null; // Opsiyonel, tamamlandığında dolacak (artık manuel)
}

interface TaskModalProps {
    task: Task | null;
    onClose: () => void;
    onUpdateTask: (updatedTask: Task) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
    refreshTasks: () => void;
}

const BACKEND_HOST = process.env.NEXT_PUBLIC_BACKEND_HOST;
const API_BASE_URL = BACKEND_HOST ? `http://${BACKEND_HOST}/tasks` : '';

console.log('DEBUG (Global): process.env.NEXT_PUBLIC_BACKEND_HOST değeri:', BACKEND_HOST);
console.log('DEBUG (Global): Oluşturulan API_BASE_URL değeri:', API_BASE_URL);

// Tarih formatlama yardımcı fonksiyonu
const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Sadece Türkiye lokasyonuna göre değil, evrensel olarak gün/ay/yıl (örn. 24.06.2025)
        // Eğer saat de istenirse: date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        console.error('Tarih formatlama hatası:', dateString, e);
        return 'Geçersiz Tarih';
    }
};

// Tarih inputu için ISO formatına dönüştürme (YYYY-MM-DD)
const toISODateString = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return ''; // Geçersiz tarih
        return date.toISOString().split('T')[0]; // Sadece YYYY-MM-DD kısmını al
    } catch (e) {
        console.error('ISO Tarih formatlama hatası:', dateString, e);
        return '';
    }
};

const Home: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filter, setFilter] = useState<'all' | 'beklemede' | 'devam-ediyor' | 'tamamlandı'>('all');
    const [newTask, setNewTask] = useState<Omit<Task, 'id' | 'status' | 'createdAt' | 'completedAt'>>({
        title: '',
        description: '',
        assignedTo: '',
        assignedBy: '',
        type: '',
    });
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [countdown, setCountdown] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!BACKEND_HOST) {
            const msg = "HATA: NEXT_PUBLIC_BACKEND_HOST .env dosyasında tanımlı değil veya boş! Lütfen .env dosyanızı kontrol edin ve Next.js sunucusunu yeniden başlatın.";
            console.error(msg);
            setNotification({ message: msg, type: "error" });
            setCountdown(10);
        } else {
            console.log(`DEBUG (useEffect): Frontend tarafından görülen Backend API URL: ${API_BASE_URL}`);
        }
    }, [BACKEND_HOST, API_BASE_URL]);

    const fetchTasks = useCallback(async () => {
        if (!API_BASE_URL) {
            console.warn("API isteği gönderilemiyor: API_BASE_URL tanımsız.");
            setIsLoading(false);
            setError("API adresi belirlenemedi. Lütfen .env dosyasını ve Next.js sunucusunun başlatılmasını kontrol edin.");
            setNotification({ message: "API adresi belirlenemedi veya hatalı. Lütfen kontrol edin.", type: "error" });
            setCountdown(5);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            console.log('DEBUG (fetchTasks): Görevler için GET isteği gönderiliyor:', API_BASE_URL);
            const response = await fetch(API_BASE_URL);

            if (!response.ok) {
                const errorBody = await response.text();
                let errorMessage = `Sunucu hatası: ${response.status} - ${response.statusText}`;
                try {
                    const parsedError = JSON.parse(errorBody);
                    errorMessage = parsedError.message || errorBody;
                } catch {
                    errorMessage = `Sunucu hatası: ${response.status} - Beklenmeyen yanıt formatı. Backend'den HTML hata sayfası veya okunamayan bir yanıt gelmiş olabilir. (Yanıtın başı: ${errorBody.substring(0, Math.min(errorBody.length, 100))}...)`;
                    console.error("Backend'den beklenen JSON yerine beklenmedik bir yanıt formatı (muhtemelen HTML hata sayfası) geldi:", errorBody);
                }
                throw new Error(errorMessage);
            }
            const data: any[] = await response.json();

            console.log('DEBUG (fetchTasks): Backend\'den gelen RAW görev verisi:', data);
            const transformedTasks: Task[] = data.map(task => {
                if (!task._id) {
                    console.error('HATA (fetchTasks): Backend\'den gelen görevde _id alanı eksik veya tanımsız!', task);
                }
                return {
                    ...task,
                    id: task._id // _id'yi id'ye dönüştürüyoruz
                };
            });
            console.log('DEBUG (fetchTasks): Frontend için dönüştürülmüş görev verisi:', transformedTasks);

            setTasks(transformedTasks);
        } catch (err: any) {
            let userFriendlyError = 'Görevler yüklenemedi. Bilinmeyen bir hata oluştu.';
            if (err.message.includes('Failed to fetch')) {
                userFriendlyError = `Backend sunucusuna ulaşılamıyor veya bağlantı reddedildi. Lütfen '${BACKEND_HOST}' adresindeki backend'inizin çalıştığından ve güvenlik duvarı/CORS ayarlarının doğru olduğundan emin olun.`;
            } else if (err.message.includes('Beklenmeyen yanıt formatı') || err.message.includes('Unexpected token')) {
                 userFriendlyError = `Backend'den beklenmedik yanıt formatı alındı. İstenen adres (${API_BASE_URL}) için bir API endpoint'i tanımlanmamış olabilir veya backend'iniz hata döndürüyor olabilir. Lütfen backend API yollarınızı ve loglarını kontrol edin.`;
            } else {
                userFriendlyError = err.message;
            }
            console.error('HATA (fetchTasks): ', userFriendlyError, err);
            setError(userFriendlyError);
            setNotification({ message: userFriendlyError, type: 'error' });
            setCountdown(5);
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL, BACKEND_HOST]);

    useEffect(() => {
        if (API_BASE_URL) {
            fetchTasks();
        } else {
            console.warn("API_BASE_URL olmadığı için ilk görev çekme işlemi atlandı.");
        }
    }, [fetchTasks, API_BASE_URL]);


    const handleAddTask = async () => {
        if (!API_BASE_URL) {
             setNotification({ message: 'API adresi belirlenmedi. Lütfen .env dosyasını kontrol edin.', type: 'error' });
             setCountdown(5);
             return;
        }

        if (!newTask.title || !newTask.description || !newTask.assignedTo || !newTask.assignedBy || !newTask.type) {
            setNotification({ message: 'Lütfen tüm zorunlu alanları doldurun (Başlık, Açıklama, Atanan, Atayan, Tip).', type: 'error' });
            setCountdown(5);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            console.log('DEBUG (handleAddTask): Görev eklemek için POST isteği gönderiliyor:', API_BASE_URL, JSON.stringify({ ...newTask, status: 'beklemede' }));
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...newTask,
                    status: 'beklemede',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = errorText;
                try {
                    const parsedError = JSON.parse(errorText);
                    errorMessage = parsedError.message || JSON.stringify(parsedError.errors) || errorText;
                } catch { /* JSON değilse yakalama hatasını görmezden gel */ }

                throw new Error(errorMessage || 'Görev eklenirken bilinmeyen bir hata oluştu.');
            }

            setNewTask({
                title: '',
                description: '',
                assignedTo: '',
                assignedBy: '',
                type: '',
            });
            await fetchTasks();
            setNotification({ message: 'Görev başarıyla eklendi!', type: 'success' });
            setCountdown(5);
        } catch (err: any) {
            let userFriendlyError = 'Görev eklenemedi. Bilinmeyen bir hata oluştu.';
            if (err.message.includes('Failed to fetch')) {
                userFriendlyError = `Görev eklenemedi: Backend sunucusuna ulaşılamıyor veya bağlantı reddedildi. Lütfen '${BACKEND_HOST}' adresindeki backend'inizin çalıştığından ve güvenlik duvarı/CORS ayarlarının doğru olduğundan emin olun.`;
            } else {
                userFriendlyError = err.message;
            }
            console.error('HATA (handleAddTask): ', userFriendlyError, err);
            setError(userFriendlyError);
            setNotification({ message: userFriendlyError, type: 'error' });
            setCountdown(5);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateTask = async (updatedTask: Task) => {
        if (!API_BASE_URL) {
             setNotification({ message: 'API adresi belirlenmedi. Lütfen .env dosyasını kontrol edin.', type: 'error' });
             setCountdown(5);
             return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const url = `${API_BASE_URL}/${updatedTask.id}`;
            console.log('DEBUG (handleUpdateTask): Görev güncellemek için PUT isteği gönderiliyor:', url, updatedTask);

            // completedAt'i göndermeden önce formatı kontrol et
            const payload = { ...updatedTask };
            if (payload.completedAt === '') { // Eğer boş string ise null olarak gönder
                payload.completedAt = null;
            } else if (payload.completedAt) { // Eğer doluysa, geçerli bir tarih mi kontrol et
                 const date = new Date(payload.completedAt);
                 if (isNaN(date.getTime())) {
                     // Geçersiz tarih ise hata ver veya null yap
                     console.warn('Geçersiz bitiş tarihi formatı, null olarak gönderiliyor:', payload.completedAt);
                     payload.completedAt = null;
                 } else {
                     // Geçerli tarih ise ISO string olarak gönder (backend Date objesine çevirecek)
                     payload.completedAt = date.toISOString();
                 }
            }


            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = errorText;
                try {
                    const parsedError = JSON.parse(errorText);
                    errorMessage = parsedError.message || JSON.stringify(parsedError.errors) || errorText;
                } catch {}

                throw new Error(errorMessage || 'Görev güncellenirken bilinmeyen bir hata oluştu.');
            }

            await fetchTasks();
            setSelectedTask(null);
            setNotification({ message: 'Görev başarıyla güncellendi!', type: 'success' });
            setCountdown(5);
        } catch (err: any) {
            let userFriendlyError = 'Görev güncellenemedi. Bilinmeyen bir hata oluştu.';
            if (err.message.includes('Failed to fetch')) {
                userFriendlyError = `Görev güncellenemedi: Backend sunucusuna ulaşılamıyor veya bağlantı reddedildi. Lütfen '${BACKEND_HOST}' adresindeki backend'inizin çalıştığından ve güvenlik duvarı/CORS ayarlarının doğru olduğundan emin olun.`;
            } else {
                userFriendlyError = err.message;
            }
            console.error('HATA (handleUpdateTask): ', userFriendlyError, err);
            setError(userFriendlyError);
            setNotification({ message: userFriendlyError, type: 'error' });
            setCountdown(5);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        console.log('DEBUG (handleDeleteTask): Silinecek Görev ID (fonksiyon başlangıcı):', taskId);
        if (!taskId) {
            const errorMessage = "HATA: Silme işlemi için Görev ID'si bulunamadı. Lütfen geçerli bir görev ID'si sağlayın.";
            console.error(errorMessage);
            setNotification({ message: errorMessage, type: 'error' });
            setCountdown(5);
            return;
        }

        if (!API_BASE_URL) {
             setNotification({ message: 'API adresi belirlenmedi. Lütfen .env dosyasını kontrol edin.', type: 'error' });
             setCountdown(5);
             return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const url = `${API_BASE_URL}/${taskId}`;
            console.log('DEBUG (handleDeleteTask): Görev silmek için DELETE isteği gönderiliyor, URL:', url);
            const response = await fetch(url, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = errorText;
                try {
                    const parsedError = JSON.parse(errorText);
                    errorMessage = parsedError.message || errorText;
                } catch {}

                throw new Error(errorMessage || 'Görev silinirken bilinmeyen bir hata oluştu.');
            }

            await fetchTasks();
            setSelectedTask(null);
            setNotification({ message: 'Görev başarıyla silindi!', type: 'success' });
            setCountdown(5);
        } catch (err: any) {
            let userFriendlyError = 'Görev silinemedi. Bilinmeyen bir hata oluştu.';
            if (err.message.includes('Failed to fetch')) {
                userFriendlyError = `Görev silinemedi: Backend sunucusuna ulaşılamıyor veya bağlantı reddedildi. Lütfen '${BACKEND_HOST}' adresindeki backend'inizin çalıştığından ve güvenlik duvarı/CORS ayarlarının doğru olduğundan emin olun.`;
            } else if (err.message.includes('Cast to ObjectId failed')) {
                userFriendlyError = `Görev silinemedi: Geçersiz görev ID formatı. Lütfen geçerli bir ID olduğundan emin olun.`;
            }
            else {
                userFriendlyError = err.message;
            }
            console.error('HATA (handleDeleteTask): ', userFriendlyError, err);
            setError(userFriendlyError);
            setNotification({ message: userFriendlyError, type: 'error' });
            setCountdown(5);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTasks = tasks.filter((task) => {
        if (filter === 'all') return true;
        return task.status === filter;
    });

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (notification) {
            setCountdown(5);
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev === 1) {
                        clearInterval(timer!);
                        setNotification(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [notification]);

    return (
        <div className="page-container">
            <header className="header">
                <h1 className="main-title">Görev Yönetim Paneli</h1>
                <p className="header-description">
                    Günlük görevlerinizi ve projelerinizi kolayca takip edin. Yeni görevler ekleyin, mevcut görevleri yönetin ve ilerlemenizi görün.
                </p>
            </header>

            <nav className="main-nav">
                <div className="filter-buttons">
                    <button
                        className={`filter-button ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Tümü
                    </button>
                    <button
                        className={`filter-button ${filter === 'beklemede' ? 'active' : ''}`}
                        onClick={() => setFilter('beklemede')}
                    >
                        Beklemede
                    </button>
                    <button
                        className={`filter-button ${filter === 'devam-ediyor' ? 'active' : ''}`}
                        onClick={() => setFilter('devam-ediyor')}
                    >
                        Devam Ediyor
                    </button>
                    <button
                        className={`filter-button ${filter === 'tamamlandı' ? 'active' : ''}`}
                        onClick={() => setFilter('tamamlandı')}
                    >
                        Tamamlandı
                    </button>
                </div>
            </nav>

            <AnimatePresence>
                {notification && (
                    <motion.div
                        className={`notification ${notification.type === 'success' ? 'success-notification' : 'error-message'}`}
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className="notification-text">{notification.message}</span>
                        {notification.type === 'success' && (
                            <div className="notification-countdown">{countdown}</div>
                        )}
                        <div className="notification-buttons">
                            <button className="btn-cancel" onClick={() => setNotification(null)}>Kapat</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="content-wrapper">
                <section className="add-task-section">
                    <h2 className="section-title">Yeni Görev Ekle</h2>
                    <div className="input-grid">
                        <input
                            type="text"
                            placeholder="Görev Başlığı"
                            value={newTask.title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, title: e.target.value })}
                            disabled={isLoading}
                        />
                        <textarea
                            placeholder="Açıklama"
                            value={newTask.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTask({ ...newTask, description: e.target.value })}
                            disabled={isLoading}
                        ></textarea>
                        <input
                            type="text"
                            placeholder="Atanan Kişi"
                            value={newTask.assignedTo}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                            disabled={isLoading}
                        />
                        <input
                            type="text"
                            placeholder="Atayan Kişi"
                            value={newTask.assignedBy}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, assignedBy: e.target.value })}
                            disabled={isLoading}
                        />
                         <input
                            type="text"
                            placeholder="Görev Tipi (örn: Frontend, Backend, Tasarım)"
                            value={newTask.type}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, type: e.target.value })}
                            disabled={isLoading}
                        />
                    </div>
                    <button className="add-task-button" onClick={handleAddTask} disabled={isLoading}>
                        {isLoading ? 'Ekleniyor...' : <><PlusCircle size={20} /> Görev Ekle</>}
                    </button>
                </section>

                <section className="task-list-section">
                    <h2 className="section-title">Mevcut Görevler</h2>
                    {isLoading && tasks.length === 0 ? (
                        <p style={{textAlign: 'center', color: 'var(--color-text-secondary)'}}>Görevler yükleniyor...</p>
                    ) : error ? (
                        <p style={{textAlign: 'center', color: 'var(--color-accent-red)'}}>Hata: {error}</p>
                    ) : filteredTasks.length === 0 ? (
                        <p style={{textAlign: 'center', color: 'var(--color-text-secondary)'}}>Görev bulunamadı.</p>
                    ) : (
                        <div className="task-list">
                            <AnimatePresence>
                                {filteredTasks.map((task) => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="task-item listbox-item"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <div className="task-info-group main-group">
                                            <div className="label-value-pair status-pair">
                                                <strong className="task-label">Durum:</strong>
                                                <span className={`task-status-badge status-${task.status.replace(/\s/g, '-')}`}>
                                                    {task.status === 'beklemede' ? 'Beklemede' : task.status === 'devam-ediyor' ? 'Devam Ediyor' : 'Tamamlandı'}
                                                </span>
                                            </div>
                                            <div className="label-value-pair title-pair">
                                                <strong className="task-label">Başlık:</strong>
                                                <h3 className="task-title-list">{task.title}</h3>
                                            </div>
                                            <div className="label-value-pair type-pair">
                                                <strong className="task-label">Tip:</strong>
                                                <span className="task-type-list">{task.type}</span>
                                            </div>
                                        </div>

                                        <div className="task-info-group meta-group">
                                            <div className="label-value-pair assigned-pair">
                                                <User size={14} className="icon-small" />
                                                <strong className="task-label">Atanan:</strong>
                                                <span className="task-assigned-info">{task.assignedTo}</span>
                                            </div>
                                            <div className="label-value-pair added-date-pair">
                                                <Calendar size={14} className="icon-small" />
                                                <strong className="task-label">Eklendi:</strong>
                                                <span className="task-date-text">{formatDate(task.createdAt)}</span>
                                            </div>
                                            {task.completedAt && ( // completedAt null değilse göster
                                                <div className="label-value-pair completed-date-pair">
                                                    <Clock size={14} className="icon-small" />
                                                    <strong className="task-label">Bitti:</strong>
                                                    <span className="task-date-text">{formatDate(task.completedAt)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="task-actions">
                                            <button className="icon-button" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedTask(task); }}>
                                                <Edit size={18} />
                                            </button>
                                            <button className="icon-button delete-icon" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteTask(task.id); }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </section>
            </div>

            <AnimatePresence>
                {selectedTask && (
                    <TaskModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                        refreshTasks={fetchTasks}
                    />
                )}
            </AnimatePresence>

            <footer className="footer">
                <p>&copy; {new Date().getFullYear()} Görev Yönetim Sistemi. Tüm Hakları Saklıdır.</p>
            </footer>
        </div>
    );
};

// TaskModal Component (Görev Detay/Düzenleme Modalı) - Manuel tarih seçici eklendi
const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onUpdateTask, onDeleteTask, refreshTasks }) => {
    if (!task) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState<Task>(task);
    const [isLoadingModal, setIsLoadingModal] = useState(false);

    useEffect(() => {
        // Modal açıldığında veya görev değiştiğinde editedTask'i güncel tut
        setEditedTask(task);
    }, [task]);

    const handleSave = async () => {
        setIsLoadingModal(true);
        try {
            await onUpdateTask(editedTask);
            setIsEditing(false);
            refreshTasks();
        } catch (error) {
            console.error('Modalda güncelleme hatası:', error);
        } finally {
            setIsLoadingModal(false);
        }
    };

    const handleDelete = async () => {
        setIsLoadingModal(true);
        try {
            await onDeleteTask(task.id);
            onClose();
            refreshTasks();
        } catch (error) {
            console.error('Modalda silme hatası:', error);
        } finally {
            setIsLoadingModal(false);
        }
    };

    return (
        <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <button className="modal-close-button" onClick={onClose} disabled={isLoadingModal}>&times;</button>
                {isEditing ? (
                    <>
                        <h2 className="modal-task-title">Görevi Düzenle</h2>
                        <div className="input-grid">
                            <input
                                type="text"
                                placeholder="Görev Başlığı"
                                value={editedTask.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedTask({ ...editedTask, title: e.target.value })}
                                disabled={isLoadingModal}
                            />
                            <textarea
                                placeholder="Açıklama"
                                value={editedTask.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedTask({ ...editedTask, description: e.target.value })}
                                disabled={isLoadingModal}
                            ></textarea>
                            <input
                                type="text"
                                placeholder="Atanan Kişi"
                                value={editedTask.assignedTo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedTask({ ...editedTask, assignedTo: e.target.value })}
                                disabled={isLoadingModal}
                            />
                            <input
                                type="text"
                                placeholder="Atayan Kişi"
                                value={editedTask.assignedBy}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedTask({ ...editedTask, assignedBy: e.target.value })}
                                disabled={isLoadingModal}
                            />
                            <input
                                type="text"
                                placeholder="Görev Tipi (örn: Frontend, Backend, Tasarım)"
                                value={editedTask.type}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedTask({ ...editedTask, type: e.target.value })}
                                disabled={isLoadingModal}
                            />
                            <div className="label-value-pair status-edit-pair">
                                <strong className="task-label">Durum:</strong>
                                <select
                                    value={editedTask.status}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditedTask({ ...editedTask, status: e.target.value as 'beklemede' | 'devam-ediyor' | 'tamamlandı' })}
                                    className={`task-status-select status-${editedTask.status.replace(/\s/g, '-')}`}
                                    disabled={isLoadingModal}
                                >
                                    <option value="beklemede">Beklemede</option>
                                    <option value="devam-ediyor">Devam Ediyor</option>
                                    <option value="tamamlandı">Tamamlandı</option>
                                </select>
                            </div>

                            {/* Bitiş Tarihi Seçici (Manuel Değiştirme) */}
                            <div className="label-value-pair date-edit-pair">
                                <strong className="task-label">Bitiş Tarihi:</strong>
                                <input
                                    type="date" // Takvim seçici için type="date"
                                    value={toISODateString(editedTask.completedAt)} // YYYY-MM-DD formatında değer
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setEditedTask({ ...editedTask, completedAt: e.target.value || null }) // Boşsa null olarak ayarla
                                    }
                                    className="date-input"
                                    disabled={isLoadingModal}
                                />
                                {editedTask.completedAt && (
                                    <button
                                        className="clear-date-button"
                                        onClick={() => setEditedTask(prev => ({ ...prev!, completedAt: null }))}
                                        disabled={isLoadingModal}
                                    >
                                        Temizle
                                    </button>
                                )}
                            </div>

                        </div>
                        <div className="modal-actions">
                            <button className="edit-button" onClick={handleSave} disabled={isLoadingModal}>
                                {isLoadingModal ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                            <button className="btn-secondary" onClick={() => setIsEditing(false)} disabled={isLoadingModal}>İptal</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="modal-header">
                            <h2 className="modal-task-title">{task.title}</h2>
                            <span className="task-type">{task.type}</span>
                        </div>
                        <p className="modal-task-description">{task.description}</p>

                        <div className="modal-details-grid">
                            <div className="label-value-pair modal-detail-item">
                                <User className="icon-small" />
                                <strong className="task-label">Atanan:</strong> <span className="detail-value">{task.assignedTo}</span>
                            </div>
                            <div className="label-value-pair modal-detail-item">
                                <User className="icon-small" />
                                <strong className="task-label">Atayan:</strong> <span className="detail-value">{task.assignedBy}</span>
                            </div>
                            <div className="label-value-pair modal-detail-item">
                                <List className="icon-small" />
                                <strong className="task-label">Durum:</strong> <span className={`task-status-select status-${task.status.replace(/\s/g, '-')}`}>{task.status}</span>
                            </div>
                            <div className="label-value-pair modal-detail-item">
                                <Calendar className="icon-small" />
                                <strong className="task-label">Eklendi:</strong> <span className="detail-value">{formatDate(task.createdAt)}</span>
                            </div>
                            {task.completedAt && (
                                <div className="label-value-pair modal-detail-item">
                                    <Clock className="icon-small" />
                                    <strong className="task-label">Bitti:</strong> <span className="detail-value">{formatDate(task.completedAt)}</span>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button className="edit-button" onClick={() => setIsEditing(true)} disabled={isLoadingModal}>
                                <Edit size={18} /> Düzenle
                            </button>
                            <button className="delete-button" onClick={handleDelete} disabled={isLoadingModal}>
                                <Trash2 size={18} /> Sil
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
};

export default Home;