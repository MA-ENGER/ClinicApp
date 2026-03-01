import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Alert, Image, Modal, ActivityIndicator, Platform, LayoutAnimation, UIManager, Animated } from 'react-native';
import { User, Lock, Calendar, Stethoscope, ChevronRight, ChevronLeft, MapPin, Hospital, Clock, Info, DollarSign, Search, Camera, Globe, Trash2, Edit3, X, ArrowRight, MessageSquare, Star, BadgeCheck, Trophy, Briefcase, Settings, Bell, Shield, HelpCircle, LogOut, Monitor, Sun, Moon, Palette, Heart, Baby, Brain, Eye, Bone, Activity, Tooth, CheckCircle, AlertTriangle } from 'lucide-react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const API_URL = 'https://loyal-insight-production.up.railway.app/api'; // Production server URL
// const API_URL = 'http://localhost:5050/api';

const FRONTEND_DEFAULT_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
];

const toMins = (timeStr) => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return (h * 60) + m;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const generateSlotPool = (interval = 30, startMins = 9 * 60, endMins = 17 * 60) => {
    const slots = [];
    for (let m = startMins; m < endMins; m += interval) {
        const h = Math.floor(m / 60);
        const mins = m % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        const displayM = mins.toString().padStart(2, '0');
        slots.push(`${displayH.toString().padStart(2, '0')}:${displayM} ${period}`);
    }
    return slots;
};

const THEMES = {
    light: {
        primary: '#0F172A',
        secondary: '#2563EB',
        teal: '#0D9488',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        textPrimary: '#0F172A',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        success: '#059669',
        error: '#DC2626',
        accent: '#EFF6FF',
        glass: 'rgba(255, 255, 255, 0.9)',
        cardShadow: '#1E293B',
        inputBg: '#F8FAFC'
    },
    dark: {
        primary: '#FFFFFF',
        secondary: '#60A5FA',
        teal: '#2DD4BF',
        background: '#000000',
        surface: '#121212',
        textPrimary: '#FFFFFF',
        textSecondary: '#A1A1AA',
        border: '#262626',
        success: '#10B981',
        error: '#FB7185',
        accent: 'rgba(96, 165, 250, 0.15)',
        glass: 'rgba(0, 0, 0, 0.9)',
        cardShadow: '#000000',
        inputBg: '#000000'
    }
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const createStyles = (COLORS) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    header: {
        alignItems: 'center',
        marginBottom: 48
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 0.5,
        borderColor: COLORS.border
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: -1
    },
    subtitle: {
        fontSize: 17,
        color: COLORS.textSecondary,
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20
    },
    form: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: COLORS.surface,
        padding: 32,
        borderRadius: 32,
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.05,
        shadowRadius: 40,
        elevation: 10
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 14,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 54,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    inputIcon: {
        marginRight: 12
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 17,
        color: COLORS.textPrimary,
        outlineStyle: 'none'
    },
    button: {
        backgroundColor: COLORS.secondary,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.4
    },
    secondaryButton: {
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    secondaryButtonText: {
        color: COLORS.secondary,
        fontSize: 16,
        fontWeight: '600'
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase'
    },
    miniBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    roleTab: {
        flex: 1,
        height: 48,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    activeTab: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.secondary,
        borderWidth: 1,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    roleText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: '700'
    },
    scrollContent: {
        padding: 20,
        backgroundColor: COLORS.background
    },
    dashHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 24
    },
    greeting: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: -1
    },
    dashSubtitle: {
        fontSize: 17,
        color: COLORS.textSecondary,
        fontWeight: '500'
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.surface,
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 16,
        marginTop: 24,
        letterSpacing: -0.5
    },
    minimalSpecialistCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        marginBottom: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 8,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: COLORS.secondary,
        borderRadius: 10,
        padding: 3,
        borderWidth: 2,
        borderColor: COLORS.surface
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginLeft: 4
    },
    reviewCount: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
        fontWeight: '500'
    },
    bookButton: {
        backgroundColor: COLORS.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
    bookButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        marginRight: 4
    },
    minimalContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center'
    },
    minimalAvatarWrapper: {
        position: 'relative',
        marginRight: 20
    },
    minimalAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.background
    },
    minimalAvatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center'
    },
    minimalVerifyDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 2,
        shadowColor: COLORS.cardShadow,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    minimalInfo: {
        flex: 1
    },
    minimalNameText: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: -0.6,
        marginBottom: 2
    },
    minimalSpecText: {
        fontSize: 15,
        color: COLORS.secondary,
        fontWeight: '700',
        letterSpacing: -0.2
    },
    minimalLocRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6
    },
    minimalLocText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 4,
        fontWeight: '500'
    },
    premiumCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5
    },
    apptCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    apptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    apptDateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.secondary + '20'
    },
    apptDateText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.secondary,
        marginLeft: 6
    },
    apptName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary
    },
    apptNote: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginTop: 4,
        lineHeight: 20
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 24,
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.secondary + '20'
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        color: COLORS.textPrimary,
        marginLeft: 8,
        outlineStyle: 'none'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 32,
        paddingBottom: 50,
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20
    },
    textArea: {
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 16,
        fontSize: 17,
        color: COLORS.textPrimary,
        height: 120,
        textAlignVertical: 'top',
        marginBottom: 20,
        outlineStyle: 'none',
        borderWidth: 1,
        borderColor: COLORS.border
    },
    tabBar: {
        flexDirection: 'row',
        height: 84,
        backgroundColor: COLORS.glass,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        elevation: 100,
        paddingBottom: 20,
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4
    }
});

export default function App() {
    const [view, setView] = useState('login');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('PATIENT');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [bookingNote, setBookingNote] = useState('');
    const [userRole, setUserRole] = useState('PATIENT');
    const [userId, setUserId] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [doctorSlots, setDoctorSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingStatus, setBookingStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [userName, setUserName] = useState('');
    const [userImage, setUserImage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [specialty, setSpecialty] = useState('General Practitioner');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [gender, setGender] = useState('Male');
    const [customDuration, setCustomDuration] = useState('30');
    const [isCustomDuration, setIsCustomDuration] = useState(false);
    const [startWorkInput, setStartWorkInput] = useState('09:00');
    const [endWorkInput, setEndWorkInput] = useState('17:00');
    const [displayMode, setDisplayMode] = useState('light'); // light, dark
    const COLORS = THEMES[displayMode];
    const styles = useMemo(() => createStyles(COLORS), [displayMode]);

    // Advanced Selection State
    const [advSelectMode, setAdvSelectMode] = useState(null); // 'break'
    const [breakStart, setBreakStart] = useState('13:00');
    const [breakEnd, setBreakEnd] = useState('14:00');

    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('All');

    const [isEditing, setIsEditing] = useState(false);
    const [editApptId, setEditApptId] = useState(null);
    const [editNotes, setEditNotes] = useState('');

    const [activeTab, setActiveTab] = useState('discover'); // discover, schedule, messages, settings
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const chatScrollViewRef = useRef(null);

    const [scheduleSettings, setScheduleSettings] = useState({
        available_slots: FRONTEND_DEFAULT_SLOTS,
        off_days: [5, 6],
        slot_duration: 30,
        start_work: "09:00",
        end_work: "17:00"
    });
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
    };

    const smoothSetView = (newView) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setView(newView);
    };

    const smoothSetActiveTab = (newTab) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setActiveTab(newTab);
    };

    const [allAvailableSlots, setAllAvailableSlots] = useState(FRONTEND_DEFAULT_SLOTS);

    const specialtyCategories = [
        { id: 'All', label: 'All', icon: Activity },
        { id: 'Dentist', label: 'Dentist', icon: Tooth },
        { id: 'Cardiologist', label: 'Cardiology', icon: Heart },
        { id: 'Neurologist', label: 'Neurology', icon: Brain },
        { id: 'Orthopedic Surgeon', label: 'Orthopedic', icon: Bone },
        { id: 'Pediatrician', label: 'Pediatric', icon: Baby },
        { id: 'Ophthalmologist', label: 'Eye Care', icon: Eye },
        { id: 'General Practitioner', label: 'General', icon: Hospital },
    ];

    useEffect(() => {
        loadDoctors();
    }, []);

    const doctorTypes = [
        'General Practitioner', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Neurologist',
        'Orthopedic Surgeon', 'Psychiatrist', 'Ophthalmologist', 'Gynecologist', 'Dentist'
    ];

    const middleEastCountries = [
        'Iraq', 'Turkey', 'Iran', 'Syria', 'Qatar', 'Kuwait', 'Saudi Arabia', 'UAE', 'Jordan', 'Oman', 'Lebanon', 'Egypt', 'Bahrain', 'Yemen'
    ];

    const citiesByCountry = {
        'Iraq': ['Baghdad', 'Erbil', 'Basra', 'Mosul', 'Sulaymaniyah', 'Najaf', 'Karbala', 'Kirkuk', 'Ramadi', 'Fallujah', 'Amara', 'Nasiriyah', 'Kut', 'Hillah', 'Diwaniyah', 'Samarra', 'Tikrit', 'Baqubah', 'Dohuk', 'Zakho'],
        'Turkey': ['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Bursa', 'Adana', 'Gaziantep', 'Konya', 'Mersin', 'Kayseri', 'Diyarbakir', 'Eskisehir', 'Samsun', 'Denizli', 'Sanliurfa', 'Trabzon', 'Malatya', 'Erzurum', 'Sakarya', 'Kocaeli'],
        'Iran': ['Tehran', 'Mashhad', 'Isfahan', 'Tabriz', 'Shiraz', 'Karaj', 'Qom', 'Ahvaz', 'Kermanshah', 'Urmia', 'Rasht', 'Zahedan', 'Hamadan', 'Kerman', 'Yazd'],
        'Syria': ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Hama', 'Tartus', 'Deir ez-Zor', 'Raqqa', 'Idlib', 'Daraa', 'Suwayda', 'Qamishli', 'Hasakah', 'Baniyas'],
        'Qatar': ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Lusail', 'Madinat ash Shamal', 'Mesaieed', 'Dukhan', 'Al Daayen', 'Umm Salal'],
        'Kuwait': ['Kuwait City', 'Al Ahmadi', 'Hawalli', 'Salwa', 'Sabah Al Salem', 'Jabriya', 'Salmiya', 'Farwaniya', 'Fahaheel', 'Jahra'],
        'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran', 'Tabuk', 'Buraidah', 'Khamis Mushait', 'Abha', 'Jazan', 'Hail', 'Najran', 'Al Jouf', 'Al Bahah', 'Jubail', 'Yanbu', 'Qatif', 'Hofuf'],
        'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Khor Fakkan', 'Kalba', 'Dibba Al-Fujairah'],
        'Jordan': ['Amman', 'Irbid', 'Zarqa', 'Aqaba', 'Madaba', 'Salt', 'Karak', 'Ma\'an', 'Tafilah', 'Jerash', 'Ajloun', 'Mafraq'],
        'Oman': ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Barka', 'Rustaq', 'Ibra', 'Khasab', 'Buraimi'],
        'Lebanon': ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Zahle', 'Jounieh', 'Byblos', 'Baalbek', 'Nabatieh', 'Baabda'],
        'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Luxor', 'Sharm El Sheikh', 'Hurghada', 'Aswan', 'Mansoura', 'Tanta', 'Asyut', 'Port Said', 'Suez', 'Mahalla al-Kubra', 'Ismailia', 'Damietta', 'Fayoum', 'Minya'],
        'Bahrain': ['Manama', 'Riffa', 'Muharraq', 'Hamad Town', 'A\'ali', 'Isa Town', 'Sitra', 'Budaiya', 'Jidhafs'],
        'Yemen': ['Sana\'a', 'Aden', 'Taiz', 'Al Hudaydah', 'Mukalla', 'Ibb', 'Dhamar', 'Amran', 'Sayyan', 'Zabid']
    };

    const handleCountrySelect = (c) => {
        setCountry(c);
        setCity('');
    };

    const pickImage = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) await uploadImage(file);
        };
        input.click();
    };

    const uploadImage = async (file) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await axios.post(`${API_URL.replace('/api', '')}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setProfileImageUrl(response.data.imageUrl);
            Alert.alert('Success', 'Photo uploaded!');
        } catch (error) {
            Alert.alert('Upload Failed', error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRegister = async () => {
        console.log('--- Registration Attempt ---');
        console.log('Payload:', { phoneNumber, role, fullName, specialty, location: `${city}, ${country}`, gender });

        if (!phoneNumber || !password || !fullName || !country || !city) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/auth/register`, {
                phoneNumber, password, role, fullName, profileImageUrl,
                specialty: role === 'DOCTOR' ? specialty : '',
                location: `${city}, ${country}`, gender
            });
            console.log('Registration successful!', response.data);
            Alert.alert('Success', 'Account created!');
            setView('login');
        } catch (error) {
            console.error('Registration Error:', error.response?.data || error.message);
            Alert.alert('Error', error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        console.log('--- Login Attempt ---');
        console.log('API_URL:', API_URL);
        console.log('Target:', `${API_URL}/auth/login`);
        console.log('Payload:', { phoneNumber, password });

        if (!phoneNumber || !password) {
            Alert.alert('Error', 'Fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/auth/login`, { phoneNumber, password });
            console.log('Login successful!', response.data);
            setUserRole(response.data.role);
            setUserId(response.data.id);
            setUserName(response.data.name);
            setUserImage(response.data.image);
            if (response.data.role === 'DOCTOR') await loadDoctorSettings(response.data.id);
            await loadDoctors();
            await loadAppointments(response.data.id, response.data.role);
            setView('dashboard');
        } catch (error) {
            console.error('Login Error Object:', error);
            if (error.response) {
                console.error('Server Response Error:', error.response.data);
                Alert.alert('Login Failed', error.response.data.error || 'Invalid credentials');
            } else if (error.request) {
                console.error('No Response Received:', error.request);
                Alert.alert('Connection Error', 'Could not reach the server. Please check your network or if the server is running on port 5050.');
            } else {
                console.error('Setting up Request Error:', error.message);
                Alert.alert('Error', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setView('login');
        setUserId(null);
        setAppointments([]);
    };

    const loadDoctors = async () => {
        try {
            const response = await axios.get(`${API_URL}/doctors`);
            setDoctors(response.data || []);
        } catch (error) {
            console.error('Load doctors error', error);
        }
    };

    const formatLocalDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const loadAppointments = async (id, role) => {
        try {
            const type = role === 'DOCTOR' ? 'doctor' : 'patient';
            const response = await axios.get(`${API_URL}/appointments/${type}/${id}`);
            setAppointments(response.data);
        } catch (error) {
            setAppointments([]);
        }
    };

    const updateSlots = async (docId, date) => {
        setLoading(true);
        try {
            const dateStr = formatLocalDate(date);
            const response = await axios.get(`${API_URL}/doctors/${docId}/slots?date=${dateStr}`);
            setDoctorSlots((response.data || []).map(s => typeof s === 'string' ? { time: s, isAvailable: true } : s));
        } catch (error) {
            setDoctorSlots([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDoctorSlots = async (doc) => {
        setSelectedDoctor(doc);
        setView('booking');
        const today = new Date();
        setSelectedDate(today);
        setCalendarMonth(today);
        await updateSlots(doc.id, today);
    };

    const handleDateSelect = (date) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (date < now) return;
        setSelectedDate(date);
        if (selectedDoctor) updateSlots(selectedDoctor.id, date);
    };

    const changeMonth = (inc) => {
        const d = new Date(calendarMonth);
        d.setMonth(d.getMonth() + inc);
        setCalendarMonth(d);
    };

    const getDaysInMonth = (date) => {
        const y = date.getFullYear(), m = date.getMonth();
        return { daysInMonth: new Date(y, m + 1, 0).getDate(), firstDay: new Date(y, m, 1).getDay() };
    };

    const handleBook = async () => {
        if (!selectedDoctor || !selectedSlot || !userId) return;
        setLoading(true);
        try {
            const dateStr = formatLocalDate(selectedDate);
            await axios.post(`${API_URL}/appointments`, {
                doctorId: selectedDoctor.id, patientId: userId,
                time: `${dateStr} ${selectedSlot}`, notes: bookingNote
            });
            Alert.alert('Success', 'Confirmed!');
            await loadAppointments(userId, userRole);
            setView('dashboard');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAppointment = async (id) => {
        try {
            await axios.delete(`${API_URL}/appointments/${id}`);
            await loadAppointments(userId, userRole);
        } catch (error) {
            Alert.alert('Error', 'Failed to cancel');
        }
    };

    const handleEdit = (appt) => {
        setEditApptId(appt.id);
        setEditNotes(appt.notes || '');
        setIsEditing(true);
    };

    const submitEdit = async () => {
        try {
            await axios.put(`${API_URL}/appointments/${editApptId}`, { notes: editNotes });
            setIsEditing(false);
            await loadAppointments(userId, userRole);
        } catch (error) {
            Alert.alert('Error', 'Failed to update');
        }
    };

    const loadDoctorSettings = async (id) => {
        try {
            const res = await axios.get(`${API_URL}/doctors/${id}/settings`);
            setScheduleSettings(res.data.schedule_settings);
            setAllAvailableSlots(res.data.default_all_slots);
            setStartWorkInput(res.data.schedule_settings.start_work || '09:00');
            setEndWorkInput(res.data.schedule_settings.end_work || '17:00');
        } catch (err) { }
    };

    const updateDoctorSettings = async () => {
        setLoading(true);
        try {
            await axios.put(`${API_URL}/doctors/${userId}/settings`, scheduleSettings);
            Alert.alert('Success', 'Updated!');
            setView('dashboard');
        } catch (err) {
            Alert.alert('Error', 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const toggleOffDay = (day) => {
        const days = scheduleSettings.off_days.includes(day)
            ? scheduleSettings.off_days.filter(d => d !== day)
            : [...scheduleSettings.off_days, day];
        setScheduleSettings({ ...scheduleSettings, off_days: days });
    };

    const toggleTimeSlot = (slot) => {
        const slots = scheduleSettings.available_slots.includes(slot)
            ? scheduleSettings.available_slots.filter(s => s !== slot)
            : [...scheduleSettings.available_slots, slot];
        setScheduleSettings({ ...scheduleSettings, available_slots: slots });
    };

    const handleDurationChange = (duration) => {
        const startM = toMins(scheduleSettings.start_work);
        const endM = toMins(scheduleSettings.end_work);
        const newPool = generateSlotPool(duration, startM, endM);
        setAllAvailableSlots(newPool);
        setScheduleSettings({
            ...scheduleSettings,
            slot_duration: duration,
            available_slots: [] // Reset selection as slots shifted
        });
        Alert.alert('Duration Updated', `Slots are now generated every ${duration} minutes. Please select your new working hours.`);
    };

    const handleWorkHoursChange = () => {
        const startM = toMins(startWorkInput);
        const endM = toMins(endWorkInput);

        if (startM >= endM) {
            Alert.alert('Invalid Time', 'Start time must be earlier than end time');
            return;
        }

        const newPool = generateSlotPool(scheduleSettings.slot_duration, startM, endM);
        setAllAvailableSlots(newPool);
        setScheduleSettings({
            ...scheduleSettings,
            start_work: startWorkInput,
            end_work: endWorkInput,
            available_slots: [] // Reset as boundaries changed
        });
        Alert.alert('Hours Applied', 'Working window updated. Please select your specific working slots below.');
    };

    const handleBulkSelect = (type) => {
        let newSlots = [...scheduleSettings.available_slots];
        if (type === 'all') {
            newSlots = [...allAvailableSlots];
        } else if (type === 'clear') {
            newSlots = [];
        } else if (type === 'morning') {
            newSlots = allAvailableSlots.filter(s => s.includes('AM'));
        } else if (type === 'afternoon') {
            newSlots = allAvailableSlots.filter(s => s.includes('PM'));
        }

        setScheduleSettings({
            ...scheduleSettings,
            available_slots: newSlots
        });
    };

    const handleAdvancedApply = () => {
        let newSlots = [];

        if (advSelectMode === 'break') {
            const bStart = toMins(breakStart);
            const bEnd = toMins(breakEnd);

            newSlots = allAvailableSlots.filter(s => {
                const m = toMins(s);
                return !(m >= bStart && m < bEnd);
            });
        }

        setScheduleSettings({
            ...scheduleSettings,
            available_slots: newSlots
        });
        Alert.alert('Applied', 'Slots updated based on your custom range.');
        setAdvSelectMode(null);
    };

    const loadConversations = async (uid) => {
        try {
            const res = await axios.get(`${API_URL}/messages/conversations/${uid || userId}`);
            setConversations(res.data);
        } catch (e) { console.error('Conv load failed', e); }
    };

    const loadChatHistory = async (targetId) => {
        try {
            const res = await axios.get(`${API_URL}/messages/${userId}/${targetId}`);
            setChatHistory(res.data);
        } catch (e) { console.error('History load failed', e); }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedConversation) return;
        try {
            const payload = {
                senderId: userId,
                receiverId: selectedConversation.peerId,
                content: messageInput
            };
            const res = await axios.post(`${API_URL}/messages`, payload);
            setChatHistory([...chatHistory, res.data]);
            setMessageInput('');
            loadConversations();
        } catch (e) { Alert.alert('Error', 'Message failed to send'); }
    };

    return (
        <View style={{
            flex: 1,
            backgroundColor: '#fff',
            height: Platform.OS === 'web' ? '100vh' : '100%',
            overflow: 'hidden'
        }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* LOGIN VIEW */}
                {view === 'login' && (
                    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                            <View style={styles.header}>
                                <View style={styles.logoContainer}>
                                    <Stethoscope color={COLORS.secondary} size={48} />
                                </View>
                                <Text style={styles.title}>ClinicBook</Text>
                                <Text style={styles.subtitle}>Your health, scheduled simple.</Text>
                            </View>
                            <View style={[styles.form, { alignSelf: 'center' }]}>
                                <View style={styles.inputContainer}>
                                    <User size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Mobile Number"
                                        style={styles.input}
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        keyboardType="phone-pad"
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Lock size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Password"
                                        secureTextEntry
                                        style={styles.input}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholderTextColor={COLORS.textSecondary}
                                    />
                                </View>
                                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                                    <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.secondaryButton} onPress={() => setView('register')}>
                                    <Text style={styles.secondaryButtonText}>Create an Account</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Custom Toast Notification */}
                {toast.visible && (
                    <Animated.View style={{
                        position: 'absolute',
                        top: 50,
                        left: 20,
                        right: 20,
                        backgroundColor: toast.type === 'success' ? COLORS.success : COLORS.error,
                        padding: 16,
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        zIndex: 9999,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.2,
                        shadowRadius: 20,
                        elevation: 10
                    }}>
                        {toast.type === 'success' ? <CheckCircle size={20} color="#FFF" /> : <AlertTriangle size={20} color="#FFF" />}
                        <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 12, flex: 1 }}>{toast.message}</Text>
                        <TouchableOpacity onPress={() => setToast({ ...toast, visible: false })}>
                            <X size={18} color="#FFF" opacity={0.7} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* REGISTER VIEW */}
                {view === 'register' && (
                    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Join Us</Text>
                                <Text style={styles.subtitle}>Create your profile to start.</Text>
                            </View>
                            <View style={styles.form}>
                                <View style={styles.inputContainer}>
                                    <User size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                    <TextInput placeholder="Full Name" style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor={COLORS.textSecondary} />
                                </View>
                                <View style={styles.inputContainer}>
                                    <User size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                    <TextInput placeholder="Mobile Number" style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholderTextColor={COLORS.textSecondary} />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Lock size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                    <TextInput placeholder="Password" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} placeholderTextColor={COLORS.textSecondary} />
                                </View>

                                <Text style={styles.label}>Gender</Text>
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    {['Male', 'Female'].map(g => (
                                        <TouchableOpacity
                                            key={g}
                                            style={[styles.roleTab, gender === g && styles.activeTab]}
                                            onPress={() => setGender(g)}
                                        >
                                            <Text style={[styles.roleText, gender === g && styles.activeTabText]}>{g}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.label}>I am a</Text>
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    <TouchableOpacity style={[styles.roleTab, role === 'PATIENT' && styles.activeTab]} onPress={() => setRole('PATIENT')}>
                                        <Text style={[styles.roleText, role === 'PATIENT' && styles.activeTabText]}>Patient</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.roleTab, role === 'DOCTOR' && styles.activeTab]} onPress={() => setRole('DOCTOR')}>
                                        <Text style={[styles.roleText, role === 'DOCTOR' && styles.activeTabText]}>Doctor</Text>
                                    </TouchableOpacity>
                                </View>

                                {role === 'DOCTOR' && (
                                    <>
                                        <Text style={styles.label}>Specialty</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                                            {doctorTypes.map(type => (
                                                <TouchableOpacity
                                                    key={type}
                                                    onPress={() => setSpecialty(type)}
                                                    style={{
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 10,
                                                        backgroundColor: specialty === type ? COLORS.secondary : 'rgba(142,142,147,0.1)',
                                                        borderRadius: 12,
                                                        marginRight: 10
                                                    }}
                                                >
                                                    <Text style={{ color: specialty === type ? '#FFF' : COLORS.textPrimary, fontWeight: '600', fontSize: 13 }}>{type}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>

                                        <Text style={styles.label}>Profile Photo</Text>
                                        <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
                                            <Camera size={18} color={COLORS.secondary} />
                                            <Text style={{ marginLeft: 10, color: COLORS.secondary, fontWeight: '700', fontSize: 13 }}>
                                                {profileImageUrl ? 'Identity Secured ✓' : 'Add Professional Photo'}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <Text style={styles.label}>Country</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                                    {middleEastCountries.map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            onPress={() => handleCountrySelect(c)}
                                            style={{
                                                paddingHorizontal: 18,
                                                paddingVertical: 10,
                                                backgroundColor: country === c ? COLORS.secondary : 'rgba(142,142,147,0.1)',
                                                borderRadius: 20,
                                                marginRight: 10
                                            }}
                                        >
                                            <Text style={{ color: country === c ? '#FFF' : COLORS.textPrimary, fontWeight: '600', fontSize: 13 }}>{c}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {country !== '' && (
                                    <>
                                        <Text style={styles.label}>City in {country}</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                                            {citiesByCountry[country].map(ct => (
                                                <TouchableOpacity
                                                    key={ct}
                                                    onPress={() => setCity(ct)}
                                                    style={{
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 10,
                                                        backgroundColor: city === ct ? COLORS.secondary : COLORS.surface,
                                                        borderRadius: 12,
                                                        marginRight: 10,
                                                        borderWidth: 1,
                                                        borderColor: city === ct ? COLORS.secondary : COLORS.border
                                                    }}
                                                >
                                                    <Text style={{ color: city === ct ? '#FFF' : COLORS.textPrimary, fontWeight: '600', fontSize: 13 }}>{ct}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </>
                                )}

                                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                                    <Text style={styles.buttonText}>{loading ? 'Creating Identity...' : 'Register Account'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.secondaryButton} onPress={() => setView('login')}>
                                    <Text style={styles.secondaryButtonText}>Back to Login</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {view === 'dashboard' && (
                    <View style={{
                        flex: 1,
                        backgroundColor: COLORS.background,
                        height: Platform.OS === 'web' ? '100vh' : '100%'
                    }}>
                        {/* Main Content Area */}
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.scrollContent}>
                                <View style={styles.dashHeader}>
                                    {!isSearchVisible ? (
                                        <>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                                                {activeTab !== 'discover' && (
                                                    <Text style={styles.greeting}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</Text>
                                                )}
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                {activeTab === 'discover' && (
                                                    <TouchableOpacity
                                                        onPress={() => setIsSearchVisible(true)}
                                                        style={[styles.avatar, { marginRight: 12, backgroundColor: COLORS.surface }]}
                                                    >
                                                        <Search size={22} color={COLORS.secondary} />
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity style={[styles.avatar, { backgroundColor: COLORS.surface }]}>
                                                    <Bell size={24} color={COLORS.secondary} />
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    ) : (
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            flex: 1,
                                            backgroundColor: COLORS.surface,
                                            borderRadius: 20,
                                            paddingHorizontal: 16,
                                            height: 58,
                                            borderWidth: 1.5,
                                            borderColor: COLORS.secondary + '40',
                                            shadowColor: COLORS.secondary,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 10,
                                            elevation: 4
                                        }}>
                                            <TouchableOpacity onPress={() => { setIsSearchVisible(false); setSearchQuery(''); }}>
                                                <ChevronLeft size={24} color={COLORS.secondary} />
                                            </TouchableOpacity>
                                            <TextInput
                                                autoFocus
                                                placeholder="Search specialists, clinics..."
                                                placeholderTextColor={COLORS.textSecondary}
                                                style={{
                                                    flex: 1,
                                                    fontSize: 17,
                                                    fontWeight: '600',
                                                    color: COLORS.primary,
                                                    marginLeft: 12,
                                                    outlineStyle: 'none'
                                                }}
                                                value={searchQuery}
                                                onChangeText={setSearchQuery}
                                            />
                                            {searchQuery.length > 0 && (
                                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                                    <X size={20} color={COLORS.textSecondary} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {activeTab === 'discover' && (
                                    <>
                                        {userRole === 'PATIENT' ? (
                                            <>

                                                <View style={{ marginBottom: 32 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                                        <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 }}>Doctor Specialty</Text>
                                                        <TouchableOpacity onPress={() => setSelectedSpecialtyFilter('All')}>
                                                            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.secondary }}>See All</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                                                        {specialtyCategories.map((cat) => (
                                                            <TouchableOpacity
                                                                key={cat.id}
                                                                onPress={() => setSelectedSpecialtyFilter(cat.id)}
                                                                style={{ alignItems: 'center', marginRight: 24 }}
                                                            >
                                                                <View style={{
                                                                    width: 68,
                                                                    height: 68,
                                                                    borderRadius: 34,
                                                                    backgroundColor: selectedSpecialtyFilter === cat.id ? COLORS.secondary : COLORS.accent,
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    marginBottom: 10,
                                                                    shadowColor: selectedSpecialtyFilter === cat.id ? COLORS.secondary : 'transparent',
                                                                    shadowOffset: { width: 0, height: 4 },
                                                                    shadowOpacity: selectedSpecialtyFilter === cat.id ? 0.3 : 0,
                                                                    shadowRadius: 8,
                                                                    elevation: selectedSpecialtyFilter === cat.id ? 6 : 0,
                                                                    borderWidth: selectedSpecialtyFilter === cat.id ? 0 : 1,
                                                                    borderColor: COLORS.secondary + '20'
                                                                }}>
                                                                    {cat.icon ? (
                                                                        <cat.icon size={26} color={selectedSpecialtyFilter === cat.id ? '#FFF' : COLORS.secondary} />
                                                                    ) : (
                                                                        <Stethoscope size={26} color={selectedSpecialtyFilter === cat.id ? '#FFF' : COLORS.secondary} />
                                                                    )}
                                                                </View>
                                                                <Text style={{
                                                                    fontSize: 12,
                                                                    fontWeight: selectedSpecialtyFilter === cat.id ? '800' : '600',
                                                                    color: selectedSpecialtyFilter === cat.id ? COLORS.primary : COLORS.textSecondary,
                                                                    textAlign: 'center'
                                                                }}>{cat.label}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>

                                                <Text style={styles.sectionTitle}>Medical Specialist Registry</Text>
                                                {doctors.length > 0 ? (
                                                    doctors.filter(d => {
                                                        const matchesSearch = (d.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                            (d.specialty || '').toLowerCase().includes(searchQuery.toLowerCase());
                                                        const matchesSpec = selectedSpecialtyFilter === 'All' || d.specialty === selectedSpecialtyFilter;
                                                        return matchesSearch && matchesSpec;
                                                    }).map((doc, idx) => (
                                                        <TouchableOpacity
                                                            key={idx}
                                                            style={styles.minimalSpecialistCard}
                                                            onPress={() => fetchDoctorSlots(doc)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View style={styles.minimalContainer}>
                                                                <View style={styles.minimalAvatarWrapper}>
                                                                    {doc.profile_image_url ? (
                                                                        <Image source={{ uri: doc.profile_image_url }} style={styles.minimalAvatar} />
                                                                    ) : (
                                                                        <View style={styles.minimalAvatarPlaceholder}>
                                                                            <User size={32} color={COLORS.secondary} />
                                                                        </View>
                                                                    )}
                                                                    <View style={styles.minimalVerifyDot}>
                                                                        <BadgeCheck size={16} color={COLORS.secondary} fill="#FFF" />
                                                                    </View>
                                                                </View>
                                                                <View style={styles.minimalInfo}>
                                                                    <Text style={styles.minimalNameText}>{doc.full_name}</Text>
                                                                    <Text style={styles.minimalSpecText}>{doc.specialty}</Text>
                                                                    <View style={styles.minimalLocRow}>
                                                                        <MapPin size={12} color={COLORS.textSecondary} />
                                                                        <Text style={styles.minimalLocText}>{doc.location?.split(',')[0] || 'Medical Center'}</Text>
                                                                    </View>
                                                                </View>
                                                            </View>
                                                        </TouchableOpacity>
                                                    ))
                                                ) : (
                                                    <View style={{ padding: 10 }}>
                                                        {[1, 2, 3].map(i => (
                                                            <View key={i} style={[styles.minimalSpecialistCard, { opacity: 0.5, backgroundColor: COLORS.accent }]}>
                                                                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.border }} />
                                                                <View style={{ marginLeft: 20, flex: 1 }}>
                                                                    <View style={{ width: '60%', height: 16, backgroundColor: COLORS.border, borderRadius: 4, marginBottom: 8 }} />
                                                                    <View style={{ width: '40%', height: 12, backgroundColor: COLORS.border, borderRadius: 4 }} />
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </>
                                        ) : (
                                            <View style={{ padding: 40, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 24, shadowColor: COLORS.cardShadow, shadowOpacity: 0.05, shadowRadius: 15 }}>
                                                <Stethoscope size={48} color={COLORS.secondary} opacity={0.5} />
                                                <Text style={{ marginTop: 20, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Welcome, Dr. {userName}</Text>
                                                <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 }}>You can manage your schedule and patient messages from the tabs below.</Text>
                                            </View>
                                        )}
                                    </>
                                )}

                                {activeTab === 'schedule' && (
                                    <>
                                        {appointments.length > 0 ? (
                                            appointments.map((appt, i) => (
                                                <View key={i} style={styles.apptCard}>
                                                    <View style={styles.apptHeader}>
                                                        <View style={styles.apptDateBox}>
                                                            <Calendar size={14} color={COLORS.secondary} />
                                                            <Text style={styles.apptDateText}>
                                                                {new Date(appt.appointment_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </Text>
                                                        </View>
                                                        <TouchableOpacity onPress={() => handleDeleteAppointment(appt.id)} style={{ padding: 4 }}>
                                                            <Trash2 size={18} color={COLORS.error} opacity={0.6} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <Text style={styles.apptName}>{userRole === 'DOCTOR' ? appt.patient_name : appt.doctor_name}</Text>
                                                    <Text style={styles.apptNote}>{appt.notes || 'Routine Checkup'}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <View style={{ paddingVertical: 100, alignItems: 'center', justifyContent: 'center' }}>
                                                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                                    <Calendar size={32} color={COLORS.secondary} />
                                                </View>
                                                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', letterSpacing: -0.5 }}>No appointments yet</Text>
                                                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>Your scheduled visits will appear here.</Text>
                                            </View>
                                        )}
                                    </>
                                )}

                                {activeTab === 'messages' && (
                                    <>
                                        {conversations.length > 0 ? (
                                            conversations.map((conv, i) => (
                                                <TouchableOpacity key={i} style={[styles.premiumCard, { marginBottom: 12 }]} onPress={() => {
                                                    setSelectedConversation(conv);
                                                    loadChatHistory(conv.peerId);
                                                    setView('chat');
                                                }}>
                                                    <View style={{ flexDirection: 'row', padding: 16, alignItems: 'center' }}>
                                                        <View style={[styles.avatar, { width: 48, height: 48, marginRight: 16 }]}>
                                                            {conv.peerImage ? <Image source={{ uri: conv.peerImage }} style={{ width: '100%', height: '100%' }} /> : <User size={20} color={COLORS.secondary} />}
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 17, fontWeight: '700' }}>{conv.peerName}</Text>
                                                                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{conv.timestamp ? new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                                                            </View>
                                                            <Text numberOfLines={1} style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4 }}>{conv.lastMessage || 'Start a conversation'}</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <View style={{ paddingVertical: 100, alignItems: 'center', justifyContent: 'center' }}>
                                                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                                    <MessageSquare size={32} color={COLORS.secondary} />
                                                </View>
                                                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', letterSpacing: -0.5 }}>No messages yet</Text>
                                                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>Start a conversation with a specialist.</Text>
                                            </View>
                                        )}
                                    </>
                                )}

                                {activeTab === 'settings' && (
                                    <View style={{ padding: 4 }}>
                                        {/* Profile Card */}
                                        <View style={[styles.premiumCard, { padding: 24, marginBottom: 20 }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={[styles.minimalAvatarWrapper, { marginRight: 20 }]}>
                                                    {userImage ? (
                                                        <Image source={{ uri: userImage }} style={styles.minimalAvatar} />
                                                    ) : (
                                                        <View style={styles.minimalAvatarPlaceholder}>
                                                            <User size={32} color={COLORS.secondary} />
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 }}>{userName}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.accent, borderRadius: 8 }}>
                                                            <Text style={{ color: COLORS.secondary, fontSize: 12, fontWeight: '700' }}>{userRole}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
                                                    <Edit3 size={20} color={COLORS.secondary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Settings Sections */}
                                        <View style={[styles.premiumCard, { padding: 0, overflow: 'hidden' }]}>
                                            {[
                                                ...(userRole === 'DOCTOR' ? [{ id: 'hours', icon: Clock, label: 'Manage Working Hours', color: COLORS.secondary, onPress: () => { loadDoctorSettings(userId); setView('doctorSettings'); } }] : []),
                                                { id: 'account', icon: Shield, label: 'Account Security', color: COLORS.textPrimary },
                                                { id: 'display', icon: Palette, label: 'Display & Appearance', color: '#8B5CF6', onPress: () => setView('display') },
                                                { id: 'notifications', icon: Bell, label: 'Notification Preferences', color: '#F59E0B' },
                                                { id: 'help', icon: HelpCircle, label: 'Help & SupportCenter', color: COLORS.teal },
                                                { id: 'signout', icon: LogOut, label: 'Sign Out', color: COLORS.error, onPress: handleLogout }
                                            ].map((item, idx, arr) => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        padding: 18,
                                                        borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                                                        borderBottomColor: COLORS.border
                                                    }}
                                                    onPress={item.onPress}
                                                >
                                                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: item.color + '15', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                                        <item.icon size={20} color={item.color} />
                                                    </View>
                                                    <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.primary }}>{item.label}</Text>
                                                    <ChevronRight size={18} color={COLORS.textSecondary} opacity={0.3} />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Custom iOS Tab Bar - Fixed at bottom */}
                        <View style={[styles.tabBar, Platform.OS === 'web' && { position: 'fixed' }]}>
                            {[
                                { id: 'discover', icon: Stethoscope, label: 'Discover' },
                                { id: 'schedule', icon: Calendar, label: 'Schedule' },
                                { id: 'messages', icon: MessageSquare, label: 'Messages' },
                                { id: 'settings', icon: Settings, label: 'Settings' }
                            ].map((tab) => (
                                <TouchableOpacity
                                    key={tab.id}
                                    style={styles.tabItem}
                                    onPress={() => {
                                        setActiveTab(tab.id);
                                        if (tab.id === 'messages') loadConversations();
                                    }}
                                >
                                    <tab.icon
                                        size={24}
                                        color={activeTab === tab.id ? COLORS.secondary : COLORS.textSecondary}
                                    />
                                    <Text style={[styles.tabLabel, { color: activeTab === tab.id ? COLORS.secondary : COLORS.textSecondary }]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )
                }

                {
                    view === 'display' && (
                        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                                <TouchableOpacity
                                    onPress={() => setView('dashboard')}
                                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}
                                >
                                    <ChevronLeft size={24} color={COLORS.secondary} />
                                    <Text style={{ color: COLORS.secondary, fontSize: 18, fontWeight: '800', marginLeft: 8 }}>Settings</Text>
                                </TouchableOpacity>

                                <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.primary, marginBottom: 8 }}>Appearance</Text>
                                <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginBottom: 40 }}>Customize your visual experience.</Text>

                                <View style={{ backgroundColor: COLORS.surface, borderRadius: 32, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}>
                                    {[
                                        { id: 'light', label: 'Light Mode', icon: Sun, color: '#F59E0B' },
                                        { id: 'dark', label: 'Dark Mode', icon: Moon, color: '#6366F1' }
                                    ].map((item, idx, arr) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 24,
                                                backgroundColor: displayMode === item.id ? COLORS.accent : 'transparent',
                                                borderBottomWidth: idx === arr.length - 1 ? 0 : 1.5,
                                                borderBottomColor: COLORS.border
                                            }}
                                            onPress={() => setDisplayMode(item.id)}
                                        >
                                            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: item.color + '15', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                                <item.icon size={20} color={item.color} />
                                            </View>
                                            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.primary }}>{item.label}</Text>
                                            {displayMode === item.id && (
                                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' }}>
                                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' }} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={{ marginTop: 40, padding: 24, backgroundColor: COLORS.surface, borderRadius: 28, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center' }}>
                                    <Monitor size={32} color={COLORS.textSecondary} opacity={0.3} style={{ marginBottom: 12 }} />
                                    <Text style={{ color: COLORS.textSecondary, textAlign: 'center', fontSize: 14, fontWeight: '600', lineHeight: 20 }}>Display mode updates will be applied globally across the clinical platform.</Text>
                                </View>
                            </ScrollView>
                        </View>
                    )
                }

                {
                    view === 'doctorSettings' && (
                        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 140 }}>
                                <TouchableOpacity
                                    onPress={() => setView('dashboard')}
                                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}
                                >
                                    <ChevronLeft size={24} color={COLORS.secondary} />
                                    <Text style={{ color: COLORS.secondary, fontSize: 18, fontWeight: '800', marginLeft: 8 }}>Dashboard</Text>
                                </TouchableOpacity>

                                <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.primary, marginBottom: 8 }}>Schedule Settings</Text>
                                <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginBottom: 32 }}>Configure your availability and booking rules.</Text>

                                {/* Settings Card */}
                                <View style={{ backgroundColor: COLORS.surface, padding: 24, borderRadius: 32, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}>

                                    {/* 1. Appointment Duration */}
                                    <View style={{ marginBottom: 32, borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9', paddingBottom: 32 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                            <Clock size={22} color={COLORS.secondary} style={{ marginRight: 12 }} />
                                            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>Session Duration</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                            {[15, 30, 45, 60].map((d) => (
                                                <TouchableOpacity
                                                    key={d}
                                                    onPress={() => {
                                                        setIsCustomDuration(false);
                                                        handleDurationChange(d);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 60,
                                                        paddingVertical: 14,
                                                        borderRadius: 16,
                                                        backgroundColor: !isCustomDuration && scheduleSettings.slot_duration === d ? COLORS.secondary : '#F8FAFC',
                                                        alignItems: 'center',
                                                        borderWidth: 1.5,
                                                        borderColor: !isCustomDuration && scheduleSettings.slot_duration === d ? COLORS.secondary : '#E2E8F0'
                                                    }}
                                                >
                                                    <Text style={{ color: !isCustomDuration && scheduleSettings.slot_duration === d ? '#FFF' : COLORS.textSecondary, fontWeight: '800', fontSize: 13 }}>{d}m</Text>
                                                </TouchableOpacity>
                                            ))}
                                            <TouchableOpacity
                                                onPress={() => setIsCustomDuration(true)}
                                                style={{
                                                    flex: 1,
                                                    minWidth: 70,
                                                    paddingVertical: 14,
                                                    borderRadius: 16,
                                                    backgroundColor: isCustomDuration ? COLORS.secondary : '#F8FAFC',
                                                    alignItems: 'center',
                                                    borderWidth: 1.5,
                                                    borderColor: isCustomDuration ? COLORS.secondary : '#E2E8F0'
                                                }}
                                            >
                                                <Text style={{ color: isCustomDuration ? '#FFF' : COLORS.textSecondary, fontWeight: '800', fontSize: 13 }}>Custom</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {isCustomDuration && (
                                            <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center' }}>
                                                <TextInput
                                                    keyboardType="numeric"
                                                    value={customDuration}
                                                    onChangeText={setCustomDuration}
                                                    placeholder="Minutes (e.g. 20)"
                                                    placeholderTextColor={COLORS.textSecondary}
                                                    style={{ flex: 1, height: 54, backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 20, borderWidth: 1.5, borderColor: '#E2E8F0', fontSize: 16, fontWeight: '600' }}
                                                />
                                                <TouchableOpacity
                                                    onPress={() => handleDurationChange(parseInt(customDuration) || 30)}
                                                    style={{ marginLeft: 12, backgroundColor: COLORS.primary, paddingHorizontal: 24, height: 54, borderRadius: 16, justifyContent: 'center' }}
                                                >
                                                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Apply</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 12, fontStyle: 'italic' }}>Note: Changing duration will refresh your slot selection below.</Text>
                                    </View>

                                    {/* 2. Working Hours */}
                                    <View style={{ marginBottom: 32, borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9', paddingBottom: 32 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                            <Calendar size={22} color={COLORS.secondary} style={{ marginRight: 12 }} />
                                            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>Operating Hours</Text>
                                        </View>

                                        {/* Presets */}
                                        <View style={{ flexDirection: 'row', marginBottom: 20, flexWrap: 'wrap' }}>
                                            {[
                                                { label: '9 AM - 5 PM', s: '09:00', e: '17:00' },
                                                { label: '8 AM - 4 PM', s: '08:00', e: '16:00' },
                                                { label: '10 AM - 10 PM', s: '10:00', e: '22:00' }
                                            ].map((preset) => (
                                                <TouchableOpacity
                                                    key={preset.label}
                                                    onPress={() => {
                                                        setStartWorkInput(preset.s);
                                                        setEndWorkInput(preset.e);
                                                    }}
                                                    style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.accent, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.secondary }}
                                                >
                                                    <Text style={{ fontSize: 12, color: COLORS.secondary, fontWeight: '800' }}>{preset.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '700' }}>Start Time</Text>
                                                <TextInput
                                                    value={startWorkInput}
                                                    onChangeText={setStartWorkInput}
                                                    placeholder="09:00"
                                                    placeholderTextColor={COLORS.textSecondary}
                                                    style={{ backgroundColor: COLORS.background, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '700' }}>End Time</Text>
                                                <TextInput
                                                    value={endWorkInput}
                                                    onChangeText={setEndWorkInput}
                                                    placeholder="17:00"
                                                    placeholderTextColor={COLORS.textSecondary}
                                                    style={{ backgroundColor: COLORS.background, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}
                                                />
                                            </View>
                                            <TouchableOpacity
                                                onPress={handleWorkHoursChange}
                                                style={{ backgroundColor: COLORS.secondary, paddingHorizontal: 24, height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.secondary, shadowOpacity: 0.2, shadowRadius: 10 }}
                                            >
                                                <ArrowRight size={22} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* 3. Off Days */}
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                            <Calendar size={22} color={COLORS.secondary} style={{ marginRight: 12 }} />
                                            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>Weekend / Off Days</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                                <TouchableOpacity
                                                    key={day}
                                                    onPress={() => toggleOffDay(index)}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: '22%',
                                                        paddingVertical: 14,
                                                        borderRadius: 16,
                                                        backgroundColor: scheduleSettings.off_days.includes(index) ? (displayMode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FFF1F2') : COLORS.background,
                                                        borderWidth: 1.5,
                                                        borderColor: scheduleSettings.off_days.includes(index) ? COLORS.error : COLORS.border,
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Text style={{ color: scheduleSettings.off_days.includes(index) ? COLORS.error : COLORS.primary, fontWeight: '800', fontSize: 13 }}>{day}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                <View style={{ backgroundColor: COLORS.surface, padding: 24, borderRadius: 32, shadowColor: COLORS.cardShadow, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                                        <Clock size={22} color={COLORS.secondary} style={{ marginRight: 12 }} />
                                        <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>Availability Manager</Text>
                                    </View>

                                    {/* Bulk Actions */}
                                    <View style={{ marginBottom: 32 }}>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
                                            {[
                                                { label: 'Select All', action: 'all' },
                                                { label: 'Clear Selected', action: 'clear' },
                                                { label: 'Morning Only', action: 'morning' },
                                                { label: 'Afternoon Only', action: 'afternoon' }
                                            ].map((btn) => (
                                                <TouchableOpacity
                                                    key={btn.label}
                                                    onPress={() => handleBulkSelect(btn.action)}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: '45%',
                                                        paddingVertical: 14,
                                                        backgroundColor: COLORS.surface,
                                                        borderRadius: 16,
                                                        alignItems: 'center',
                                                        borderWidth: 1.5,
                                                        borderColor: '#E2E8F0',
                                                        shadowColor: '#000',
                                                        shadowOffset: { width: 0, height: 2 },
                                                        shadowOpacity: 0.03,
                                                        shadowRadius: 5
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 13, fontWeight: '800', color: btn.action === 'clear' ? COLORS.error : COLORS.secondary }}>{btn.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <View style={{ marginTop: 20 }}>
                                            <TouchableOpacity
                                                onPress={() => setAdvSelectMode(advSelectMode === 'break' ? null : 'break')}
                                                style={{
                                                    padding: 16,
                                                    backgroundColor: advSelectMode === 'break' ? '#F0FDFA' : COLORS.surface,
                                                    borderRadius: 16,
                                                    alignItems: 'center',
                                                    borderWidth: 2,
                                                    borderColor: advSelectMode === 'break' ? COLORS.secondary : COLORS.secondary,
                                                    borderStyle: 'dashed'
                                                }}
                                            >
                                                <Text style={{ color: COLORS.secondary, fontWeight: '900', fontSize: 14 }}>🕒 Set Custom Break Window</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Advanced Break UI */}
                                        {advSelectMode === 'break' && (
                                            <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1.5, borderTopColor: '#F1F5F9' }}>
                                                <Text style={{ fontWeight: '800', marginBottom: 16, color: COLORS.primary }}>Define Break (Hide Slots):</Text>
                                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, alignItems: 'center' }}>
                                                    <TextInput
                                                        value={breakStart}
                                                        onChangeText={setBreakStart}
                                                        placeholder="13:00"
                                                        style={{ flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: '700' }}
                                                    />
                                                    <Text style={{ fontWeight: '700', color: COLORS.textSecondary }}>to</Text>
                                                    <TextInput
                                                        value={breakEnd}
                                                        onChangeText={setBreakEnd}
                                                        placeholder="14:00"
                                                        style={{ flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: '700' }}
                                                    />
                                                </View>
                                                <TouchableOpacity onPress={handleAdvancedApply} style={{ backgroundColor: COLORS.error, padding: 16, borderRadius: 16, alignItems: 'center' }}>
                                                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Remove Range from Active Slots</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                        {allAvailableSlots.map((slot) => (
                                            <TouchableOpacity
                                                key={slot}
                                                onPress={() => toggleTimeSlot(slot)}
                                                style={{
                                                    width: '31.3%',
                                                    marginRight: '2%',
                                                    paddingVertical: 14,
                                                    marginBottom: 12,
                                                    borderRadius: 14,
                                                    backgroundColor: scheduleSettings.available_slots.includes(slot) ? COLORS.secondary : '#F8FAFC',
                                                    borderWidth: 2,
                                                    borderColor: scheduleSettings.available_slots.includes(slot) ? COLORS.secondary : '#E2E8F0',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Text style={{
                                                    color: scheduleSettings.available_slots.includes(slot) ? '#FFF' : COLORS.primary,
                                                    fontWeight: '700',
                                                    fontSize: 13
                                                }}>{slot}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={updateDoctorSettings}
                                    disabled={loading}
                                    style={{
                                        backgroundColor: '#007AFF',
                                        paddingVertical: 16,
                                        borderRadius: 15,
                                        alignItems: 'center',
                                        opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{loading ? 'Saving...' : 'Save Schedule Settings'}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    )
                }

                {
                    view === 'booking' && (
                        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
                                <View style={{ padding: 20 }}>
                                    <TouchableOpacity
                                        onPress={() => setView('dashboard')}
                                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32, paddingVertical: 12 }}
                                    >
                                        <View style={[styles.arrowCircle, { marginRight: 12, backgroundColor: COLORS.surface }]}>
                                            <ChevronLeft color={COLORS.primary} size={20} />
                                        </View>
                                        <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '700' }}>Back to Dashboard</Text>
                                    </TouchableOpacity>

                                    {!selectedDoctor ? (
                                        <View style={{ marginTop: 100, alignItems: 'center' }}>
                                            <ActivityIndicator color={COLORS.secondary} size="large" />
                                            <Text style={{ fontSize: 17, color: COLORS.textSecondary, marginTop: 16 }}>Finding doctor details...</Text>
                                        </View>
                                    ) : (
                                        <View>
                                            <View style={{ alignItems: 'center', marginBottom: 40 }}>
                                                <View style={[styles.avatar, { width: 120, height: 120, borderRadius: 40, marginBottom: 20 }]}>
                                                    {selectedDoctor.profile_image_url ? (
                                                        <Image source={{ uri: selectedDoctor.profile_image_url }} style={{ width: '100%', height: '100%' }} />
                                                    ) : (
                                                        <Stethoscope size={48} color={COLORS.secondary} />
                                                    )}
                                                </View>
                                                <Text style={styles.greeting}>{selectedDoctor.full_name || 'Dr. Specialist'}</Text>
                                                <Text style={{ fontSize: 18, color: COLORS.secondary, fontWeight: '700', marginTop: 6 }}>{selectedDoctor.specialty || 'Medical Expert'}</Text>
                                            </View>

                                            <View style={[styles.premiumCard, { marginBottom: 40, padding: 24, flexDirection: 'column' }]}>
                                                <View style={{ marginBottom: 24 }}>
                                                    <Text style={styles.miniBadgeText}>Primary Facility</Text>
                                                    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary, marginTop: 6 }}>{selectedDoctor.hospital || 'Main Medical Center'}</Text>
                                                </View>
                                                <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20 }}>
                                                    <Text style={styles.miniBadgeText}>Facility Address</Text>
                                                    <Text style={{ fontSize: 16, color: COLORS.textPrimary, marginTop: 6, opacity: 0.8 }}>{selectedDoctor.location || 'Healthcare Hub, Tower 1'}</Text>
                                                </View>
                                            </View>

                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
                                                <View style={{ width: '100%', maxWidth: 440, marginBottom: 25, backgroundColor: COLORS.surface, padding: 24, borderRadius: 28, alignSelf: 'flex-start', shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowCircle}>
                                                            <ChevronLeft color={COLORS.primary} size={20} />
                                                        </TouchableOpacity>
                                                        <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>
                                                            {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                        </Text>
                                                        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowCircle}>
                                                            <ChevronRight color={COLORS.primary} size={20} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                                            <Text key={d} style={{ width: 40, textAlign: 'center', fontWeight: '700', color: COLORS.textSecondary, fontSize: 12 }}>{d}</Text>
                                                        ))}
                                                    </View>
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                                        {(() => {
                                                            const { daysInMonth, firstDay } = getDaysInMonth(calendarMonth);
                                                            const days = [];
                                                            for (let i = 0; i < firstDay; i++) {
                                                                days.push(<View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />);
                                                            }
                                                            const now = new Date();
                                                            now.setHours(0, 0, 0, 0);
                                                            for (let i = 1; i <= daysInMonth; i++) {
                                                                const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i);
                                                                const isSelected = date.toDateString() === selectedDate.toDateString();
                                                                const isPast = date < now;
                                                                days.push(
                                                                    <TouchableOpacity
                                                                        key={i}
                                                                        disabled={isPast}
                                                                        style={{
                                                                            width: '14.28%',
                                                                            aspectRatio: 1,
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            backgroundColor: isSelected ? COLORS.secondary : 'transparent',
                                                                            borderRadius: 16,
                                                                            opacity: isPast ? 0.3 : 1
                                                                        }}
                                                                        onPress={() => handleDateSelect(date)}
                                                                    >
                                                                        <Text style={{
                                                                            color: isSelected ? '#fff' : (isPast ? COLORS.textSecondary : COLORS.primary),
                                                                            fontWeight: isSelected ? '800' : '600',
                                                                            fontSize: 15
                                                                        }}>
                                                                            {i}
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                );
                                                            }
                                                            return days;
                                                        })()}
                                                    </View>
                                                </View>

                                                <View style={{ flex: 1, minWidth: 320 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                                        <View style={{ width: 4, height: 24, backgroundColor: COLORS.secondary, borderRadius: 2, marginRight: 12 }} />
                                                        <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.primary }}>
                                                            Available Slots
                                                        </Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                                        {Array.isArray(doctorSlots) && doctorSlots.length > 0 ? doctorSlots.map((slotObj, i) => {
                                                            const slotTime = slotObj.time;
                                                            let isAvailable = slotObj.isAvailable;
                                                            const isSelected = selectedSlot === slotTime;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={i}
                                                                    onPress={() => isAvailable ? setSelectedSlot(slotTime) : null}
                                                                    disabled={!isAvailable}
                                                                    style={{
                                                                        width: '31%',
                                                                        marginRight: '2%',
                                                                        paddingVertical: 14,
                                                                        borderRadius: 16,
                                                                        backgroundColor: isAvailable ? (isSelected ? COLORS.secondary : COLORS.surface) : (displayMode === 'dark' ? '#1E293B' : '#F1F5F9'),
                                                                        borderWidth: 1.5,
                                                                        borderColor: isSelected ? COLORS.secondary : (isAvailable ? COLORS.border : 'transparent'),
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        marginBottom: 12,
                                                                        shadowColor: isSelected ? COLORS.secondary : '#000',
                                                                        shadowOffset: { width: 0, height: 4 },
                                                                        shadowOpacity: isSelected ? 0.2 : 0,
                                                                        shadowRadius: 8
                                                                    }}
                                                                >
                                                                    <Text style={{
                                                                        color: isSelected ? '#FFF' : (isAvailable ? COLORS.primary : COLORS.textSecondary),
                                                                        fontWeight: '700',
                                                                        fontSize: 13
                                                                    }}>{slotTime}</Text>
                                                                </TouchableOpacity>
                                                            );
                                                        }) : (
                                                            <View style={{ padding: 40, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 24, width: '100%', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' }}>
                                                                <Clock size={32} color={COLORS.textSecondary} opacity={0.5} />
                                                                <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontWeight: '600' }}>No slots available for this date</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>

                                            <View style={{ marginTop: 40, paddingBottom: 60 }}>
                                                <Text style={styles.label}>Additional Notes for Doctor</Text>
                                                <TextInput
                                                    placeholder="Describe your symptoms or any special requirements..."
                                                    style={styles.textArea}
                                                    multiline
                                                    value={bookingNote}
                                                    onChangeText={setBookingNote}
                                                />
                                                <TouchableOpacity
                                                    onPress={handleBook}
                                                    disabled={loading || !selectedSlot}
                                                    style={[
                                                        styles.button,
                                                        (!selectedSlot || loading) && { backgroundColor: '#E2E8F0', shadowOpacity: 0 }
                                                    ]}
                                                >
                                                    <Text style={[styles.buttonText, !selectedSlot && { color: COLORS.textSecondary }]}>
                                                        {loading ? 'Securing Appointment...' : (selectedSlot ? `Confirm for ${selectedSlot}` : 'Select a Time Slot')}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        </View>
                    )
                }

                {
                    view === 'chat' && (
                        <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
                            {/* Chat Header */}
                            <View style={{ height: 110, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.95)', flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20 }}>
                                <TouchableOpacity onPress={() => setView('dashboard')} style={{ marginBottom: 10, marginRight: 16 }}>
                                    <ChevronLeft size={28} color={COLORS.secondary} />
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginBottom: 5 }}>
                                    <View style={[styles.avatar, { width: 40, height: 40, marginRight: 12, borderRadius: 20 }]}>
                                        {selectedConversation?.peerImage ? <Image source={{ uri: selectedConversation.peerImage }} style={{ width: '100%', height: '100%' }} /> : <User size={20} color={COLORS.secondary} />}
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 17, fontWeight: '700' }}>{selectedConversation?.peerName || 'Chat'}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 }} />
                                            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Online</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Message List */}
                            <ScrollView
                                style={{ flex: 1, padding: 16 }}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                ref={chatScrollViewRef}
                                onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
                            >
                                {chatHistory.map((msg, i) => {
                                    const isMe = String(msg.senderId) === String(userId);
                                    return (
                                        <View key={i} style={{
                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                            maxWidth: '80%',
                                            marginBottom: 12,
                                            alignItems: isMe ? 'flex-end' : 'flex-start'
                                        }}>
                                            <View style={{
                                                backgroundColor: isMe ? COLORS.secondary : (displayMode === 'dark' ? '#334155' : '#E9E9EB'),
                                                paddingHorizontal: 16,
                                                paddingVertical: 10,
                                                borderRadius: 20,
                                                borderBottomRightRadius: isMe ? 4 : 20,
                                                borderBottomLeftRadius: isMe ? 20 : 4
                                            }}>
                                                <Text style={{ fontSize: 16, color: isMe ? '#FFF' : COLORS.textPrimary, lineHeight: 21 }}>{msg.content}</Text>
                                            </View>
                                            <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 4, marginLeft: isMe ? 0 : 4, marginRight: isMe ? 4 : 0 }}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>

                            {/* Message Input */}
                            <SafeAreaView style={{ borderTopWidth: 0.5, borderTopColor: COLORS.border, backgroundColor: COLORS.surface }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: Platform.OS === 'ios' ? 0 : 12 }}>
                                    <TouchableOpacity style={{ marginRight: 12 }}>
                                        <Camera size={26} color={COLORS.secondary} />
                                    </TouchableOpacity>
                                    <View style={{ flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, flexDirection: 'row', alignItems: 'center' }}>
                                        <TextInput
                                            placeholder="iMessage"
                                            placeholderTextColor={COLORS.textSecondary}
                                            style={{ flex: 1, fontSize: 16, color: COLORS.textPrimary, outlineStyle: 'none' }}
                                            multiline
                                            value={messageInput}
                                            onChangeText={setMessageInput}
                                        />
                                        {messageInput.trim().length > 0 && (
                                            <TouchableOpacity onPress={sendMessage}>
                                                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' }}>
                                                    <ChevronRight color="#FFF" size={20} />
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </SafeAreaView>
                        </View>
                    )
                }
            </SafeAreaView >

            <Modal visible={isEditing} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800' }}>Update Notes</Text>
                            <TouchableOpacity onPress={() => setIsEditing(false)}><X size={24} color="#666" /></TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.textArea}
                            value={editNotes}
                            onChangeText={setEditNotes}
                            multiline
                            placeholder="Add clinical notes..."
                        />
                        <TouchableOpacity style={styles.button} onPress={submitEdit} disabled={loading}>
                            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Update Appointment'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

