import { useState, useEffect } from 'react';
import { mobileStorage } from './utils/storage';
import { MobileLogin } from './pages/MobileLogin';
import { MobileDashboard } from './pages/MobileDashboard';
import { TripStart } from './pages/TripStart';
import { TripEnd } from './pages/TripEnd';
import { ProblemReport } from './pages/ProblemReport';
import { History } from './pages/History';

type MobileView = 
  | 'login' 
  | 'dashboard' 
  | 'trip-start' 
  | 'trip-end' 
  | 'problem-report' 
  | 'history';

export const MobileApp = () => {
  const [currentView, setCurrentView] = useState<MobileView>('login');

  useEffect(() => {
    // Verificar se o usuário já está logado
    if (mobileStorage.isLoggedIn()) {
      setCurrentView('dashboard');
    }
  }, []);

  const handleLoginSuccess = () => {
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    mobileStorage.clearCurrentDriver();
    mobileStorage.clearCurrentTrip();
    mobileStorage.clearPendingProblems();
    setCurrentView('login');
  };

  const handleStartTrip = () => {
    setCurrentView('trip-start');
  };

  const handleTripStarted = () => {
    setCurrentView('dashboard');
  };

  const handleEndTrip = () => {
    setCurrentView('trip-end');
  };

  const handleTripEnded = () => {
    setCurrentView('dashboard');
  };

  const handleReportProblem = () => {
    setCurrentView('problem-report');
  };

  const handleProblemReported = () => {
    // Voltar para a tela anterior (trip-end ou dashboard)
    const hasActiveTrip = mobileStorage.hasActiveTrip();
    setCurrentView(hasActiveTrip ? 'trip-end' : 'dashboard');
  };

  const handleViewHistory = () => {
    setCurrentView('history');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return <MobileLogin onLoginSuccess={handleLoginSuccess} />;
      
      case 'dashboard':
        return (
          <MobileDashboard 
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
            onViewHistory={handleViewHistory}
            onLogout={handleLogout}
          />
        );
      
      case 'trip-start':
        return (
          <TripStart 
            onTripStarted={handleTripStarted}
            onBack={handleBackToDashboard}
          />
        );
      
      case 'trip-end':
        return (
          <TripEnd 
            onTripEnded={handleTripEnded}
            onReportProblem={handleReportProblem}
            onBack={handleBackToDashboard}
          />
        );
      
      case 'problem-report':
        return (
          <ProblemReport 
            onProblemReported={handleProblemReported}
            onBack={() => {
              // Voltar para a tela anterior baseado no contexto
              const hasActiveTrip = mobileStorage.hasActiveTrip();
              setCurrentView(hasActiveTrip ? 'trip-end' : 'dashboard');
            }}
          />
        );
      
      case 'history':
        return (
          <History 
            onBack={handleBackToDashboard}
          />
        );
      
      default:
        return <MobileLogin onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className="mobile-app">
      {renderCurrentView()}
    </div>
  );
};