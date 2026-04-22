import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      dashboard: {
        title: 'Dashboard',
        welcome: 'Welcome back',
        scan_sms: 'Sync Transactions',
        paste_sms: 'Paste your Mobile Money message here to save your transaction',
        scanning: 'Syncing...',
        today_transactions: "Today's Transactions",
        history: 'History',
        no_transactions: 'No transactions today',
        check_history: 'Check History or Reports for other days',
        money_received: 'Money Received',
        money_sent: 'Money Sent'
      },
      settings: {
        title: 'Settings',
        preferences: 'Preferences',
        language: 'Language',
        select_language: 'Select your language',
        sms_detection: 'SMS Auto-Detection',
        sms_desc: 'Automatically log Mobile Money SMS',
        sms_explanation_title: 'SMS Access Required',
        sms_explanation_body: 'MoMo Tracker needs access to your SMS messages to automatically detect and log your Mobile Money transactions. We only scan messages from your Mobile Money provider to help you track your spending. Your data stays private on your device.',
        sms_explanation_btn: 'Continue',
        dark_mode: 'Dark Mode',
        dark_mode_desc: 'Toggle app appearance',
        country_currency: 'Country & Currency',
        country_desc: 'Set your local currency',
        security: 'Security',
        change_pin: 'Change PIN',
        data: 'Data',
        backup: 'Backup Data',
        clear_data: 'Clear All Data',
        about: 'About',
        privacy: 'Privacy Policy',
        terms: 'Terms and Conditions'
      },
      common: {
        upgrade: 'Upgrade to Premium',
        premium_active: 'Premium Active',
        premium_desc: 'Remove ads, unlock unlimited SMS auto-detection and manual scanning.',
        premium_active_desc: 'You have access to all advanced features. Tap to manage.',
        upgrade_now: 'Upgrade Now',
        loading: 'Processing...',
        nav: {
          home: 'Home',
          history: 'History',
          reports: 'Reports',
          settings: 'Settings'
        }
      }
    }
  },
  fr: {
    translation: {
      dashboard: {
        title: 'Tableau de bord',
        welcome: 'Bon retour',
        scan_sms: 'Appuyez ici pour scanner automatiquement votre boîte de réception et ajouter vos transactions Mobile Money',
        paste_sms: 'Copiez votre message Mobile Money et collez-le ici pour conserver vos dossiers',
        scanning: 'Analyse en cours...',
        today_transactions: "Transactions d'aujourd'hui",
        history: 'Historique',
        no_transactions: "Pas de transactions aujourd'hui",
        check_history: "Consultez l'historique ou les rapports pour d'autres jours",
        money_received: 'Argent reçu',
        money_sent: 'Argent envoyé'
      },
      settings: {
        title: 'Paramètres',
        preferences: 'Préférences',
        language: 'Langue',
        select_language: 'Choisissez votre langue',
        sms_detection: 'Détection automatique des SMS',
        sms_desc: 'Enregistrer automatiquement les SMS Mobile Money',
        sms_explanation_title: 'Accès SMS requis',
        sms_explanation_body: 'MoMo Tracker a besoin d\'accéder à vos SMS pour détecter et enregistrer automatiquement vos transactions Mobile Money. Nous ne scannons que les messages de votre fournisseur Mobile Money pour vous aider à suivre vos dépenses. Vos données restent privées sur votre appareil.',
        sms_explanation_btn: 'Continuer',
        dark_mode: 'Mode sombre',
        dark_mode_desc: "Changer l'apparence de l'application",
        country_currency: 'Pays et devise',
        country_desc: 'Définissez votre devise locale',
        security: 'Sécurité',
        change_pin: 'Modifier le PIN',
        data: 'Données',
        backup: 'Sauvegarder les données',
        clear_data: 'Effacer toutes les données',
        about: 'À propos',
        privacy: 'Politique de confidentialité',
        terms: 'Conditions générales'
      },
      common: {
        upgrade: 'Passer au Premium',
        premium_active: 'Premium actif',
        premium_desc: 'Supprimez les publicités et débloquez la détection automatique des SMS.',
        premium_active_desc: 'Vous avez accès à toutes les fonctionnalités avancées. Appuyez pour gérer.',
        upgrade_now: 'Mettre à niveau maintenant',
        nav: {
          home: 'Accueil',
          history: 'Historique',
          reports: 'Rapports',
          settings: 'Paramètres'
        }
      }
    }
  },
  es: {
    translation: {
      dashboard: {
        title: 'Tablero',
        welcome: 'Bienvenido de nuevo',
        scan_sms: 'Toque aquí para escanear automáticamente su bandeja de entrada y agregar sus transacciones de Mobile Money',
        paste_sms: 'Copie su mensaje de Mobile Money y péguelo aquí para mantener sus registros',
        scanning: 'Escaneando...',
        today_transactions: 'Transacciones de hoy',
        history: 'Historial',
        no_transactions: 'No hay transacciones hoy',
        check_history: 'Consulte el Historial o los Informes para otros días',
        money_received: 'Dinero recibido',
        money_sent: 'Dinero enviado'
      },
      settings: {
        title: 'Ajustes',
        preferences: 'Preferencias',
        language: 'Idioma',
        select_language: 'Seleccione su idioma',
        sms_detection: 'Detección automática de SMS',
        sms_desc: 'Registrar automáticamente SMS de Mobile Money',
        dark_mode: 'Modo oscuro',
        dark_mode_desc: 'Cambiar la apariencia de la aplicación',
        country_currency: 'País y moneda',
        country_desc: 'Establezca su moneda local',
        security: 'Seguridad',
        change_pin: 'Cambiar PIN',
        data: 'Datos',
        backup: 'Copia de seguridad de datos',
        clear_data: 'Borrar todos los datos',
        about: 'Acerca de',
        privacy: 'Política de privacidad',
        terms: 'Términos y condiciones'
      },
      common: {
        upgrade: 'Mejorar a Premium',
        premium_active: 'Premium activo',
        premium_desc: 'Elimine anuncios y desbloquee la detección automática de SMS.',
        premium_active_desc: 'Tiene acceso a todas las funciones avanzadas. Toque para administrar.',
        upgrade_now: 'Mejorar ahora',
        nav: {
          home: 'Inicio',
          history: 'Historial',
          reports: 'Informes',
          settings: 'Ajustes'
        }
      }
    }
  },
  de: {
    translation: {
      dashboard: {
        title: 'Dashboard',
        welcome: 'Willkommen zurück',
        scan_sms: 'Tippen Sie hier, um Ihren Posteingang automatisch zu scannen und Ihre Mobile Money-Transaktionen hinzuzufügen',
        paste_sms: 'Kopieren Sie Ihre Mobile Money-Nachricht und fügen Sie sie hier ein, um Ihre Aufzeichnungen zu führen',
        scanning: 'Scannen...',
        today_transactions: 'Heutige Transaktionen',
        history: 'Verlauf',
        no_transactions: 'Keine Transaktionen heute',
        check_history: 'Überprüfen Sie den Verlauf oder die Berichte für andere Tage',
        money_received: 'Geld erhalten',
        money_sent: 'Geld gesendet'
      },
      settings: {
        title: 'Einstellungen',
        preferences: 'Präferenzen',
        language: 'Sprache',
        select_language: 'Wählen Sie Ihre Sprache',
        sms_detection: 'SMS-Auto-Erkennung',
        sms_desc: 'Mobile Money-SMS automatisch protokollieren',
        dark_mode: 'Dunkelmodus',
        dark_mode_desc: 'App-Erscheinungsbild ändern',
        country_currency: 'Land & Währung',
        country_desc: 'Legen Sie Ihre lokale Währung fest',
        security: 'Sicherheit',
        change_pin: 'PIN ändern',
        data: 'Daten',
        backup: 'Datensicherung',
        clear_data: 'Alle Daten löschen',
        about: 'Über',
        privacy: 'Datenschutzrichtlinie',
        terms: 'Allgemeine Geschäftsbedingungen'
      },
      common: {
        upgrade: 'Auf Premium upgraden',
        premium_active: 'Premium aktiv',
        premium_desc: 'Werbung entfernen und SMS-Auto-Erkennung freischalten.',
        premium_active_desc: 'Sie haben Zugriff auf alle erweiterten Funktionen. Zum Verwalten tippen.',
        upgrade_now: 'Jetzt upgraden',
        nav: {
          home: 'Startseite',
          history: 'Verlauf',
          reports: 'Berichte',
          settings: 'Einstellungen'
        }
      }
    }
  },
  pt: {
    translation: {
      dashboard: {
        title: 'Painel',
        welcome: 'Bem-vindo de volta',
        scan_sms: 'Toque aqui para verificar automaticamente sua caixa de entrada e adicionar suas transações de Mobile Money',
        paste_sms: 'Copie sua mensagem de Mobile Money e cole-a aqui para manter seus registros',
        scanning: 'Verificando...',
        today_transactions: 'Transações de hoje',
        history: 'Histórico',
        no_transactions: 'Nenhuma transação hoje',
        check_history: 'Verifique o Histórico ou Relatórios de outros dias',
        money_received: 'Dinheiro recebido',
        money_sent: 'Dinheiro enviado'
      },
      settings: {
        title: 'Configurações',
        preferences: 'Preferências',
        language: 'Idioma',
        select_language: 'Selecione seu idioma',
        sms_detection: 'Detecção automática de SMS',
        sms_desc: 'Registrar automaticamente SMS de Mobile Money',
        dark_mode: 'Modo escuro',
        dark_mode_desc: 'Alternar aparência do aplicativo',
        country_currency: 'País e moeda',
        country_desc: 'Defina sua moeda local',
        security: 'Segurança',
        change_pin: 'Alterar PIN',
        data: 'Dados',
        backup: 'Backup de dados',
        clear_data: 'Limpar todos os dados',
        about: 'Sobre',
        privacy: 'Política de privacidade',
        terms: 'Termos e condições'
      },
      common: {
        upgrade: 'Atualizar para Premium',
        premium_active: 'Premium ativo',
        premium_desc: 'Remova anúncios e desbloqueie a detecção automática de SMS.',
        premium_active_desc: 'Você tem acesso a todos os recursos avançados. Toque para gerenciar.',
        upgrade_now: 'Atualizar agora',
        nav: {
          home: 'Início',
          history: 'Histórico',
          reports: 'Relatórios',
          settings: 'Configurações'
        }
      }
    }
  },
  sw: {
    translation: {
      dashboard: {
        title: 'Dashibodi',
        welcome: 'Karibu tena',
        scan_sms: 'Sawazisha Miamala',
        paste_sms: 'Bandika ujumbe wako wa Mobile Money hapa ili kuuweka mwenyewe',
        scanning: 'Inasawazisha...',
        today_transactions: "Miamala ya Leo",
        history: 'Historia',
        no_transactions: 'Hakuna miamala leo',
        check_history: 'Angalia Historia au Ripoti za siku nyingine',
        money_received: 'Pesa Zilizopokelewa',
        money_sent: 'Pesa Zilizotumwa'
      },
      settings: {
        title: 'Mipangilio',
        preferences: 'Mapendeleo',
        language: 'Lugha',
        select_language: 'Chagua lugha yako',
        sms_detection: 'Ugunduzi wa SMS',
        sms_desc: 'Rekodi kiotomatiki SMS za Mobile Money',
        sms_explanation_title: 'Ruhusa ya SMS Inahitajika',
        sms_explanation_body: 'MoMo Tracker inahitaji ruhusa ya kusoma ujumbe wako wa SMS ili kutambua na kuweka miamala yako ya Mobile Money kiotomatiki. Tunasoma tu ujumbe kutoka kwa mtoa huduma wako wa Mobile Money ili kukusaidia kufuatilia matumizi yako. Data yako inabaki kuwa siri kwenye simu yako.',
        sms_explanation_btn: 'Endelea',
        dark_mode: 'Hali ya Giza',
        dark_mode_desc: 'Badilisha mwonekano wa programu',
        country_currency: 'Nchi na Sarafu',
        country_desc: 'Weka sarafu yako ya ndani',
        security: 'Usalama',
        change_pin: 'Badilisha PIN',
        data: 'Data',
        backup: 'Hifadhi Data',
        clear_data: 'Futa Data Zote',
        about: 'Kuhusu',
        privacy: 'Sera ya Faragha',
        terms: 'Vigezo na Masharti'
      },
      common: {
        upgrade: 'Pata Toleo la Premium',
        premium_active: 'Premium Imewashwa',
        premium_desc: 'Ondoa matangazo na ufungue ugunduzi wa SMS kiotomatiki.',
        premium_active_desc: 'Una ufikiaji wa vipengele vyote vya juu. Gusa ili kudhibiti.',
        upgrade_now: 'Pata Sasa',
        nav: {
          home: 'Nyumbani',
          history: 'Historia',
          reports: 'Ripoti',
          settings: 'Mipangilio'
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('momo_language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
