import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3020' : '');

function buildApiUrl(path) {
  // En desarrollo apunta por defecto a http://localhost:3020
  // En producción, si no hay REACT_APP_API_URL, usa rutas relativas (/apiDesercion/...)
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
}

function getPeriodoAnterior1(periodo) {
  if (!periodo) return '';
  const [anio, sem] = periodo.split('-').map(Number);
  if (!anio || !sem) return '';
  if (sem === 1) return `${anio - 1}-2`;
  return `${anio}-${sem - 1}`;
}

function App() {
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState(null);
  const [periodos, setPeriodos] = useState([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  const [vista, setVista] = useState('matriculas');
  const [modoOscuro, setModoOscuro] = useState(localStorage.getItem('modoOscuro') === 'true');
  const [riesgoUmbral, setRiesgoUmbral] = useState(0.7);
  const [riesgoLista, setRiesgoLista] = useState([]);
  const [loadingRiesgo, setLoadingRiesgo] = useState(false);
  const [errorRiesgo, setErrorRiesgo] = useState(null);
  const [riesgoFacultad, setRiesgoFacultad] = useState('');
  const [riesgoPrograma, setRiesgoPrograma] = useState('');
  const [programasRiesgo, setProgramasRiesgo] = useState([]);
  const [periodosTasaDesercion, setPeriodosTasaDesercion] = useState([]);
  const [loadingTasaDesercion, setLoadingTasaDesercion] = useState(false);
  const [errorTasaDesercion, setErrorTasaDesercion] = useState(null);
  const [periodoSeleccionadoTasa, setPeriodoSeleccionadoTasa] = useState('');
  const [programasTasaDesercion, setProgramasTasaDesercion] = useState([]);
  const [programaSeleccionadoTasa, setProgramaSeleccionadoTasa] = useState('');
  const [datosTasaDesercion, setDatosTasaDesercion] = useState(null);
  const [periodosTasaAusencia, setPeriodosTasaAusencia] = useState([]);
  const [loadingTasaAusencia, setLoadingTasaAusencia] = useState(false);
  const [errorTasaAusencia, setErrorTasaAusencia] = useState(null);
  const [periodoSeleccionadoTasaAusencia, setPeriodoSeleccionadoTasaAusencia] = useState('');
  const [programasTasaAusencia, setProgramasTasaAusencia] = useState([]);
  const [programaSeleccionadoTasaAusencia, setProgramaSeleccionadoTasaAusencia] = useState('');
  const [datosTasaAusencia, setDatosTasaAusencia] = useState(null);
  const [loadingCalculoTasaAusencia, setLoadingCalculoTasaAusencia] = useState(false);
  const [errorCalculoTasaAusencia, setErrorCalculoTasaAusencia] = useState(null);
  const [mostrarModalAusenciaIntersemestral, setMostrarModalAusenciaIntersemestral] = useState(false);
  const [listaAusenciaIntersemestral, setListaAusenciaIntersemestral] = useState([]);
  const [loadingAusenciaIntersemestralModal, setLoadingAusenciaIntersemestralModal] = useState(false);
  const [mostrarModalMatriculadosAusencia, setMostrarModalMatriculadosAusencia] = useState(false);
  const [listaMatriculadosAusencia, setListaMatriculadosAusencia] = useState([]);
  const [loadingMatriculadosAusencia, setLoadingMatriculadosAusencia] = useState(false);
  const [loadingCalculoTasa, setLoadingCalculoTasa] = useState(false);
  const [errorCalculoTasa, setErrorCalculoTasa] = useState(null);
  const [mostrarModalDesertores, setMostrarModalDesertores] = useState(false);
  const [listaDesertores, setListaDesertores] = useState([]);
  const [loadingDesertores, setLoadingDesertores] = useState(false);
  const [mostrarModalMatriculados, setMostrarModalMatriculados] = useState(false);
  const [mostrarModalMatriculasGraficos, setMostrarModalMatriculasGraficos] = useState(false);
  const [listaMatriculasGraficos, setListaMatriculasGraficos] = useState([]);
  const [loadingMatriculasGraficos, setLoadingMatriculasGraficos] = useState(false);
  const [errorMatriculasGraficos, setErrorMatriculasGraficos] = useState(null);
  const [mostrarModalDesercionGraficos, setMostrarModalDesercionGraficos] = useState(false);
  const [listaDesercionGraficos, setListaDesercionGraficos] = useState([]);
  const [loadingDesercionGraficos, setLoadingDesercionGraficos] = useState(false);
  const [errorDesercionGraficos, setErrorDesercionGraficos] = useState(null);
  const [mostrarModalPrimiparosGraficos, setMostrarModalPrimiparosGraficos] = useState(false);
  const [listaPrimiparosGraficos, setListaPrimiparosGraficos] = useState([]);
  const [loadingPrimiparosGraficos, setLoadingPrimiparosGraficos] = useState(false);
  const [errorPrimiparosGraficos, setErrorPrimiparosGraficos] = useState(null);
  const [mostrarModalGraduadosGraficos, setMostrarModalGraduadosGraficos] = useState(false);
  const [listaGraduadosGraficos, setListaGraduadosGraficos] = useState([]);
  const [loadingGraduadosGraficos, setLoadingGraduadosGraficos] = useState(false);
  const [errorGraduadosGraficos, setErrorGraduadosGraficos] = useState(null);
  const [mostrarModalAusenciaGraficos, setMostrarModalAusenciaGraficos] = useState(false);
  const [listaAusenciaGraficos, setListaAusenciaGraficos] = useState([]);
  const [loadingAusenciaGraficos, setLoadingAusenciaGraficos] = useState(false);
  const [errorAusenciaGraficos, setErrorAusenciaGraficos] = useState(null);
  const [listaMatriculados, setListaMatriculados] = useState([]);
  const [loadingMatriculados, setLoadingMatriculados] = useState(false);
  const [mostrarModalGraduados, setMostrarModalGraduados] = useState(false);
  const [listaGraduadosModal, setListaGraduadosModal] = useState([]);
  const [loadingGraduadosModal, setLoadingGraduadosModal] = useState(false);
  const [mostrarModalPrimiparosGraduacion, setMostrarModalPrimiparosGraduacion] = useState(false);
  const [listaPrimiparosGraduacion, setListaPrimiparosGraduacion] = useState([]);
  const [loadingPrimiparosGraduacion, setLoadingPrimiparosGraduacion] = useState(false);
  const [mostrarModalPrimiparosPromedio, setMostrarModalPrimiparosPromedio] = useState(false);
  const [listaPrimiparosPromedio, setListaPrimiparosPromedio] = useState([]);
  const [loadingPrimiparosPromedio, setLoadingPrimiparosPromedio] = useState(false);
  const [desercion, setDesercion] = useState([]);
  const [loadingDesercion, setLoadingDesercion] = useState(false);
  const [primiparos, setPrimiparos] = useState([]);
  const [loadingPrimiparos, setLoadingPrimiparos] = useState(false);
  const [errorPrimiparos, setErrorPrimiparos] = useState(null);
  const [periodoPrimiparos, setPeriodoPrimiparos] = useState('');
  const [facultadPrimiparos, setFacultadPrimiparos] = useState('');
  const [programaPrimiparos, setProgramaPrimiparos] = useState('');
  const [programasPrimiparos, setProgramasPrimiparos] = useState([]);
  const [graduados, setGraduados] = useState([]);
  const [loadingGraduados, setLoadingGraduados] = useState(false);
  const [errorGraduados, setErrorGraduados] = useState(null);
  const [tasaDesercionPeriodoGrafico, setTasaDesercionPeriodoGrafico] = useState([]);
  const [loadingTasaDesercionPeriodoGrafico, setLoadingTasaDesercionPeriodoGrafico] = useState(false);
  const [errorTasaDesercionPeriodoGrafico, setErrorTasaDesercionPeriodoGrafico] = useState(null);
  const [tasaDesercionFacultadGrafico, setTasaDesercionFacultadGrafico] = useState([]);
  const [loadingTasaDesercionFacultadGrafico, setLoadingTasaDesercionFacultadGrafico] = useState(false);
  const [errorTasaDesercionFacultadGrafico, setErrorTasaDesercionFacultadGrafico] = useState(null);
  const [tasaDesercionProgramaGrafico, setTasaDesercionProgramaGrafico] = useState([]);
  const [loadingTasaDesercionProgramaGrafico, setLoadingTasaDesercionProgramaGrafico] = useState(false);
  const [errorTasaDesercionProgramaGrafico, setErrorTasaDesercionProgramaGrafico] = useState(null);
  const [tasaDesercionNivelGrafico, setTasaDesercionNivelGrafico] = useState([]);
  const [loadingTasaDesercionNivelGrafico, setLoadingTasaDesercionNivelGrafico] = useState(false);
  const [errorTasaDesercionNivelGrafico, setErrorTasaDesercionNivelGrafico] = useState(null);
  const [periodoTasaDesercionGraficoSeleccionado, setPeriodoTasaDesercionGraficoSeleccionado] = useState(null);
  const [facultadTasaDesercionGraficoSeleccionada, setFacultadTasaDesercionGraficoSeleccionada] = useState(null);
  const [programaTasaDesercionGraficoSeleccionado, setProgramaTasaDesercionGraficoSeleccionado] = useState(null);
  const [nivelTasaDesercionGraficoSeleccionado, setNivelTasaDesercionGraficoSeleccionado] = useState(null);
  const [tasaDesercionCohortePeriodoGrafico, setTasaDesercionCohortePeriodoGrafico] = useState([]);
  const [loadingTasaDesercionCohortePeriodoGrafico, setLoadingTasaDesercionCohortePeriodoGrafico] = useState(false);
  const [errorTasaDesercionCohortePeriodoGrafico, setErrorTasaDesercionCohortePeriodoGrafico] = useState(null);
  const [tasaDesercionCohorteFacultadGrafico, setTasaDesercionCohorteFacultadGrafico] = useState([]);
  const [loadingTasaDesercionCohorteFacultadGrafico, setLoadingTasaDesercionCohorteFacultadGrafico] = useState(false);
  const [errorTasaDesercionCohorteFacultadGrafico, setErrorTasaDesercionCohorteFacultadGrafico] = useState(null);
  const [tasaDesercionCohorteProgramaGrafico, setTasaDesercionCohorteProgramaGrafico] = useState([]);
  const [loadingTasaDesercionCohorteProgramaGrafico, setLoadingTasaDesercionCohorteProgramaGrafico] = useState(false);
  const [errorTasaDesercionCohorteProgramaGrafico, setErrorTasaDesercionCohorteProgramaGrafico] = useState(null);
  const [tasaDesercionCohorteNivelGrafico, setTasaDesercionCohorteNivelGrafico] = useState([]);
  const [loadingTasaDesercionCohorteNivelGrafico, setLoadingTasaDesercionCohorteNivelGrafico] = useState(false);
  const [errorTasaDesercionCohorteNivelGrafico, setErrorTasaDesercionCohorteNivelGrafico] = useState(null);
  const [periodoTasaDesercionCohorteGraficoSeleccionado, setPeriodoTasaDesercionCohorteGraficoSeleccionado] = useState(null);
  const [facultadTasaDesercionCohorteGraficoSeleccionada, setFacultadTasaDesercionCohorteGraficoSeleccionada] = useState(null);
  const [programaTasaDesercionCohorteGraficoSeleccionado, setProgramaTasaDesercionCohorteGraficoSeleccionado] = useState(null);
  const [nivelTasaDesercionCohorteGraficoSeleccionado, setNivelTasaDesercionCohorteGraficoSeleccionado] = useState(null);
  const [tasaDesercionPromedioPeriodoGrafico, setTasaDesercionPromedioPeriodoGrafico] = useState([]);
  const [loadingTasaDesercionPromedioPeriodoGrafico, setLoadingTasaDesercionPromedioPeriodoGrafico] = useState(false);
  const [errorTasaDesercionPromedioPeriodoGrafico, setErrorTasaDesercionPromedioPeriodoGrafico] = useState(null);
  const [tasaDesercionPromedioFacultadGrafico, setTasaDesercionPromedioFacultadGrafico] = useState([]);
  const [loadingTasaDesercionPromedioFacultadGrafico, setLoadingTasaDesercionPromedioFacultadGrafico] = useState(false);
  const [errorTasaDesercionPromedioFacultadGrafico, setErrorTasaDesercionPromedioFacultadGrafico] = useState(null);
  const [tasaDesercionPromedioProgramaGrafico, setTasaDesercionPromedioProgramaGrafico] = useState([]);
  const [loadingTasaDesercionPromedioProgramaGrafico, setLoadingTasaDesercionPromedioProgramaGrafico] = useState(false);
  const [errorTasaDesercionPromedioProgramaGrafico, setErrorTasaDesercionPromedioProgramaGrafico] = useState(null);
  const [tasaDesercionPromedioNivelGrafico, setTasaDesercionPromedioNivelGrafico] = useState([]);
  const [loadingTasaDesercionPromedioNivelGrafico, setLoadingTasaDesercionPromedioNivelGrafico] = useState(false);
  const [errorTasaDesercionPromedioNivelGrafico, setErrorTasaDesercionPromedioNivelGrafico] = useState(null);
  const [periodoTasaDesercionPromedioGraficoSeleccionado, setPeriodoTasaDesercionPromedioGraficoSeleccionado] = useState(null);
  const [facultadTasaDesercionPromedioGraficoSeleccionada, setFacultadTasaDesercionPromedioGraficoSeleccionada] = useState(null);
  const [programaTasaDesercionPromedioGraficoSeleccionado, setProgramaTasaDesercionPromedioGraficoSeleccionado] = useState(null);
  const [nivelTasaDesercionPromedioGraficoSeleccionado, setNivelTasaDesercionPromedioGraficoSeleccionado] = useState(null);
  const [tasaGraduacionPeriodoGrafico, setTasaGraduacionPeriodoGrafico] = useState([]);
  const [loadingTasaGraduacionPeriodoGrafico, setLoadingTasaGraduacionPeriodoGrafico] = useState(false);
  const [errorTasaGraduacionPeriodoGrafico, setErrorTasaGraduacionPeriodoGrafico] = useState(null);
  const [tasaGraduacionFacultadGrafico, setTasaGraduacionFacultadGrafico] = useState([]);
  const [loadingTasaGraduacionFacultadGrafico, setLoadingTasaGraduacionFacultadGrafico] = useState(false);
  const [errorTasaGraduacionFacultadGrafico, setErrorTasaGraduacionFacultadGrafico] = useState(null);
  const [tasaGraduacionProgramaGrafico, setTasaGraduacionProgramaGrafico] = useState([]);
  const [loadingTasaGraduacionProgramaGrafico, setLoadingTasaGraduacionProgramaGrafico] = useState(false);
  const [errorTasaGraduacionProgramaGrafico, setErrorTasaGraduacionProgramaGrafico] = useState(null);
  const [tasaGraduacionNivelGrafico, setTasaGraduacionNivelGrafico] = useState([]);
  const [loadingTasaGraduacionNivelGrafico, setLoadingTasaGraduacionNivelGrafico] = useState(false);
  const [errorTasaGraduacionNivelGrafico, setErrorTasaGraduacionNivelGrafico] = useState(null);
  const [periodoTasaGraduacionGraficoSeleccionado, setPeriodoTasaGraduacionGraficoSeleccionado] = useState(null);
  const [facultadTasaGraduacionGraficoSeleccionada, setFacultadTasaGraduacionGraficoSeleccionada] = useState(null);
  const [programaTasaGraduacionGraficoSeleccionado, setProgramaTasaGraduacionGraficoSeleccionado] = useState(null);
  const [nivelTasaGraduacionGraficoSeleccionado, setNivelTasaGraduacionGraficoSeleccionado] = useState(null);
  const [tasaAusenciaPeriodoGrafico, setTasaAusenciaPeriodoGrafico] = useState([]);
  const [loadingTasaAusenciaPeriodoGrafico, setLoadingTasaAusenciaPeriodoGrafico] = useState(false);
  const [errorTasaAusenciaPeriodoGrafico, setErrorTasaAusenciaPeriodoGrafico] = useState(null);
  const [tasaAusenciaFacultadGrafico, setTasaAusenciaFacultadGrafico] = useState([]);
  const [loadingTasaAusenciaFacultadGrafico, setLoadingTasaAusenciaFacultadGrafico] = useState(false);
  const [errorTasaAusenciaFacultadGrafico, setErrorTasaAusenciaFacultadGrafico] = useState(null);
  const [tasaAusenciaProgramaGrafico, setTasaAusenciaProgramaGrafico] = useState([]);
  const [loadingTasaAusenciaProgramaGrafico, setLoadingTasaAusenciaProgramaGrafico] = useState(false);
  const [errorTasaAusenciaProgramaGrafico, setErrorTasaAusenciaProgramaGrafico] = useState(null);
  const [tasaAusenciaNivelGrafico, setTasaAusenciaNivelGrafico] = useState([]);
  const [loadingTasaAusenciaNivelGrafico, setLoadingTasaAusenciaNivelGrafico] = useState(false);
  const [errorTasaAusenciaNivelGrafico, setErrorTasaAusenciaNivelGrafico] = useState(null);
  const [periodoTasaAusenciaGraficoSeleccionado, setPeriodoTasaAusenciaGraficoSeleccionado] = useState(null);
  const [facultadTasaAusenciaGraficoSeleccionada, setFacultadTasaAusenciaGraficoSeleccionada] = useState(null);
  const [programaTasaAusenciaGraficoSeleccionado, setProgramaTasaAusenciaGraficoSeleccionado] = useState(null);
  const [nivelTasaAusenciaGraficoSeleccionado, setNivelTasaAusenciaGraficoSeleccionado] = useState(null);
  const periodoBaseTasaAusencia = useMemo(() => {
    if (periodoTasaAusenciaGraficoSeleccionado) {
      return periodoTasaAusenciaGraficoSeleccionado;
    }
    if (periodosTasaAusencia.length > 0) {
      return periodosTasaAusencia[0];
    }
    return null;
  }, [periodoTasaAusenciaGraficoSeleccionado, periodosTasaAusencia]);
  const [tasaSupervivenciaPeriodoGrafico, setTasaSupervivenciaPeriodoGrafico] = useState([]);
  const [loadingTasaSupervivenciaPeriodoGrafico, setLoadingTasaSupervivenciaPeriodoGrafico] = useState(false);
  const [errorTasaSupervivenciaPeriodoGrafico, setErrorTasaSupervivenciaPeriodoGrafico] = useState(null);
  const [tasaSupervivenciaFacultadGrafico, setTasaSupervivenciaFacultadGrafico] = useState([]);
  const [loadingTasaSupervivenciaFacultadGrafico, setLoadingTasaSupervivenciaFacultadGrafico] = useState(false);
  const [errorTasaSupervivenciaFacultadGrafico, setErrorTasaSupervivenciaFacultadGrafico] = useState(null);
  const [tasaSupervivenciaProgramaGrafico, setTasaSupervivenciaProgramaGrafico] = useState([]);
  const [loadingTasaSupervivenciaProgramaGrafico, setLoadingTasaSupervivenciaProgramaGrafico] = useState(false);
  const [errorTasaSupervivenciaProgramaGrafico, setErrorTasaSupervivenciaProgramaGrafico] = useState(null);
  const [tasaSupervivenciaNivelGrafico, setTasaSupervivenciaNivelGrafico] = useState([]);
  const [loadingTasaSupervivenciaNivelGrafico, setLoadingTasaSupervivenciaNivelGrafico] = useState(false);
  const [errorTasaSupervivenciaNivelGrafico, setErrorTasaSupervivenciaNivelGrafico] = useState(null);
  const [periodoTasaSupervivenciaGraficoSeleccionado, setPeriodoTasaSupervivenciaGraficoSeleccionado] = useState(null);
  const [facultadTasaSupervivenciaGraficoSeleccionada, setFacultadTasaSupervivenciaGraficoSeleccionada] = useState(null);
  const [programaTasaSupervivenciaGraficoSeleccionado, setProgramaTasaSupervivenciaGraficoSeleccionado] = useState(null);
  const [nivelTasaSupervivenciaGraficoSeleccionado, setNivelTasaSupervivenciaGraficoSeleccionado] = useState(null);
  const [tasaDesercion28PeriodoGrafico, setTasaDesercion28PeriodoGrafico] = useState([]);
  const [loadingTasaDesercion28PeriodoGrafico, setLoadingTasaDesercion28PeriodoGrafico] = useState(false);
  const [errorTasaDesercion28PeriodoGrafico, setErrorTasaDesercion28PeriodoGrafico] = useState(null);
  const [tasaDesercion28FacultadGrafico, setTasaDesercion28FacultadGrafico] = useState([]);
  const [loadingTasaDesercion28FacultadGrafico, setLoadingTasaDesercion28FacultadGrafico] = useState(false);
  const [errorTasaDesercion28FacultadGrafico, setErrorTasaDesercion28FacultadGrafico] = useState(null);
  const [tasaDesercion28ProgramaGrafico, setTasaDesercion28ProgramaGrafico] = useState([]);
  const [loadingTasaDesercion28ProgramaGrafico, setLoadingTasaDesercion28ProgramaGrafico] = useState(false);
  const [errorTasaDesercion28ProgramaGrafico, setErrorTasaDesercion28ProgramaGrafico] = useState(null);
  const [tasaDesercion28NivelGrafico, setTasaDesercion28NivelGrafico] = useState([]);
  const [loadingTasaDesercion28NivelGrafico, setLoadingTasaDesercion28NivelGrafico] = useState(false);
  const [errorTasaDesercion28NivelGrafico, setErrorTasaDesercion28NivelGrafico] = useState(null);
  const [periodoTasaDesercion28GraficoSeleccionado, setPeriodoTasaDesercion28GraficoSeleccionado] = useState(null);
  const [facultadTasaDesercion28GraficoSeleccionada, setFacultadTasaDesercion28GraficoSeleccionada] = useState(null);
  const [programaTasaDesercion28GraficoSeleccionado, setProgramaTasaDesercion28GraficoSeleccionado] = useState(null);
  const [nivelTasaDesercion28GraficoSeleccionado, setNivelTasaDesercion28GraficoSeleccionado] = useState(null);


  const [periodoGraduados, setPeriodoGraduados] = useState('');
  const [facultadGraduados, setFacultadGraduados] = useState('');
  const [programaGraduados, setProgramaGraduados] = useState('');
  const [programasGraduados, setProgramasGraduados] = useState([]);
  const [periodosTasaDesercionCohorte, setPeriodosTasaDesercionCohorte] = useState([]);
  const [periodosCohorteTodos, setPeriodosCohorteTodos] = useState([]);
  const [loadingTasaDesercionCohorte, setLoadingTasaDesercionCohorte] = useState(false);
  const [errorTasaDesercionCohorte, setErrorTasaDesercionCohorte] = useState(null);
  const [periodoSeleccionadoCohorte, setPeriodoSeleccionadoCohorte] = useState('');
  const [cohorteSeleccionada, setCohorteSeleccionada] = useState('');
  const [programasTasaDesercionCohorte, setProgramasTasaDesercionCohorte] = useState([]);
  const [programaSeleccionadoCohorte, setProgramaSeleccionadoCohorte] = useState('');
  const [datosTasaDesercionCohorte, setDatosTasaDesercionCohorte] = useState(null);
  const [ultimosParametrosCohorte, setUltimosParametrosCohorte] = useState(null);
  const [loadingCalculoTasaCohorte, setLoadingCalculoTasaCohorte] = useState(false);
  const [errorCalculoTasaCohorte, setErrorCalculoTasaCohorte] = useState(null);
  const [mostrarModalPrimiparosCohorte, setMostrarModalPrimiparosCohorte] = useState(false);
  const [listaPrimiparosCohorte, setListaPrimiparosCohorte] = useState([]);
  const [loadingPrimiparosCohorte, setLoadingPrimiparosCohorte] = useState(false);

  const cohorteBaseTasaDesercionCohorte = useMemo(() => {
    if (periodoTasaDesercionCohorteGraficoSeleccionado) {
      return periodoTasaDesercionCohorteGraficoSeleccionado;
    }
    if (periodosTasaDesercionCohorte.length > 0) {
      return periodosTasaDesercionCohorte[periodosTasaDesercionCohorte.length - 1];
    }
    return null;
  }, [periodoTasaDesercionCohorteGraficoSeleccionado, periodosTasaDesercionCohorte]);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setLoginError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);

  // Normalizar texto para mostrar en celdas: saltos de línea como espacio (evita "[NO\nPROFESA\nRELIGIÓN]")
  const celdaTexto = (v) => (v != null && v !== '') ? String(v).replace(/\r?\n/g, ' ').trim() : '';

  // Lista blanca de columnas visibles/exportables para la lista de matriculados (dejar vacío para mostrar todas)
  // Columnas visibles/exportadas para matriculados: mismas que desertores
  const columnasMatriculadosPermitidas = [
    'nombre',
    'codigo',
    'programa',
    'nivel',
    'periodoIngreso',
    'estadoMatricula',
    'estadoEstudiante',
    'periodoSiguiente'
  ];

  // Función para exportar datos a CSV (todas las celdas entre comillas para evitar que Excel malinterprete)
  const exportarCSV = (datos, nombreArchivo, headersOpt) => {
    if (!datos || datos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    const total = datos.length;

    // Obtener las claves del primer objeto para crear los headers
    const headers = (headersOpt && headersOpt.length > 0)
      ? headersOpt
      : Object.keys(datos[0]);
    
    const escapeCsvCell = (value) => {
      if (value === null || value === undefined) return '""';
      const s = String(value).replace(/\r?\n/g, ' ').trim();
      return `"${s.replace(/"/g, '""')}"`;
    };

    // Una línea por registro; todas las celdas entre comillas (RFC 4180) para que el conteo coincida con Excel
    const csvContent = [
      headers.map(h => escapeCsvCell(h)).join(','),
      ...datos.map(row => headers.map(header => escapeCsvCell(row[header])).join(','))
    ].join('\r\n');

    const BOM = '\uFEFF';
    const csvContentWithBOM = BOM + csvContent;

    const blob = new Blob([csvContentWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().split('T')[0]}_${total}_registros.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const [errorDesercion, setErrorDesercion] = useState(null);
  const [periodoDesercion, setPeriodoDesercion] = useState('');
  const [programas, setProgramas] = useState([]);
  const [programaDesercion, setProgramaDesercion] = useState('');
  const [programaMatriculas, setProgramaMatriculas] = useState('');
  const [facultades, setFacultades] = useState([]);
  const [programasMatriculas, setProgramasMatriculas] = useState([]);
  const [programasDesercion, setProgramasDesercion] = useState([]);
  const [programasAusencia, setProgramasAusencia] = useState([]);
  const [facultadMatriculas, setFacultadMatriculas] = useState('');
  const [facultadDesercion, setFacultadDesercion] = useState('');
  const [ausenciaIntersemestral, setAusenciaIntersemestral] = useState([]);
  const [loadingAusenciaIntersemestral, setLoadingAusenciaIntersemestral] = useState(false);
  const [errorAusenciaIntersemestral, setErrorAusenciaIntersemestral] = useState(null);
  const [periodoAusenciaIntersemestral, setPeriodoAusenciaIntersemestral] = useState('');
  const [programaAusenciaIntersemestral, setProgramaAusenciaIntersemestral] = useState('');
  const [facultadAusenciaIntersemestral, setFacultadAusenciaIntersemestral] = useState('');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('currentUser') || '');
  const [userRol, setUserRol] = useState(localStorage.getItem('userRol') || 'usuario');
  const [configPasswordActual, setConfigPasswordActual] = useState('');
  const [configPasswordNueva, setConfigPasswordNueva] = useState('');
  const [configMsg, setConfigMsg] = useState('');
  const [configError, setConfigError] = useState('');
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [configUsuarioModal, setConfigUsuarioModal] = useState(null);
  const [configUsuarioForm, setConfigUsuarioForm] = useState({ username: '', password: '', rol: 'usuario' });
  const [conCancelados, setConCancelados] = useState(false);
  const puedeAdministrar = userRol === 'admin';
  const [tablasExpandida, setTablasExpandida] = useState(false);
  const [graficosExpandida, setGraficosExpandida] = useState(false);
  const [tasasExpandida, setTasasExpandida] = useState(false);
  const [graficosTasasExpandida, setGraficosTasasExpandida] = useState(false);
  const [graficoSeccion, setGraficoSeccion] = useState('matriculas');
  const sidebarScrollRef = React.useRef(null);
  const sidebarScrollPosition = React.useRef(0);
  const graficosScrollRestore = React.useRef(null);
  const shouldRestoreGraficosScroll = React.useRef(false);
  const graficosScrollTimers = React.useRef([]);
  const graficoMatriculasPeriodoScrollRef = React.useRef(null);
  const graficoDesercionPeriodoScrollRef = React.useRef(null);
  const graficoPrimiparosPeriodoScrollRef = React.useRef(null);
  const graficoGraduadosPeriodoScrollRef = React.useRef(null);
  const graficoAusenciaPeriodoScrollRef = React.useRef(null);
  const graficoTasaDesercionPeriodoScrollRef = React.useRef(null);
  const graficoTasaDesercionCohortePeriodoScrollRef = React.useRef(null);
  const graficoTasaDesercionPromedioPeriodoScrollRef = React.useRef(null);
  const graficoTasaGraduacionPeriodoScrollRef = React.useRef(null);
  const graficoTasaAusenciaPeriodoScrollRef = React.useRef(null);
  const graficoTasaSupervivenciaPeriodoScrollRef = React.useRef(null);
  const graficoTasaDesercion28PeriodoScrollRef = React.useRef(null);
  const [estadistica, setEstadistica] = useState([]);
  const [loadingEstadistica, setLoadingEstadistica] = useState(false);
  const [errorEstadistica, setErrorEstadistica] = useState(null);
  const [facultadPeriodo, setFacultadPeriodo] = useState('');
  const [estadisticaFacultad, setEstadisticaFacultad] = useState([]);
  const [loadingFacultad, setLoadingFacultad] = useState(false);
  const [errorFacultad, setErrorFacultad] = useState(null);
  const [programaFacultad, setProgramaFacultad] = useState('');
  const [estadisticaPrograma, setEstadisticaPrograma] = useState([]);
  const [loadingPrograma, setLoadingPrograma] = useState(false);
  const [errorPrograma, setErrorPrograma] = useState(null);
  const [estadisticaFacultadTotal, setEstadisticaFacultadTotal] = useState([]);
  const [loadingFacultadTotal, setLoadingFacultadTotal] = useState(false);
  const [errorFacultadTotal, setErrorFacultadTotal] = useState(null);
  const [estadisticaProgramaTotal, setEstadisticaProgramaTotal] = useState([]);
  const [loadingProgramaTotal, setLoadingProgramaTotal] = useState(false);
  const [errorProgramaTotal, setErrorProgramaTotal] = useState(null);
  // 1. Agregar estado para el periodo seleccionado en gráficos y para la facultad seleccionada en el gráfico de programas
  const [periodoGraficoSeleccionado, setPeriodoGraficoSeleccionado] = useState(null);
  // 1. Agregar estado para la facultad seleccionada en gráficos
  const [facultadGraficoSeleccionada, setFacultadGraficoSeleccionada] = useState(null);
  // 1. Estados para nivel
  const [estadisticaNivel, setEstadisticaNivel] = useState([]);
  const [loadingNivel, setLoadingNivel] = useState(false);
  const [errorNivel, setErrorNivel] = useState(null);
  const [estadisticaNivelTotal, setEstadisticaNivelTotal] = useState([]);
  const [loadingNivelTotal, setLoadingNivelTotal] = useState(false);
  const [errorNivelTotal, setErrorNivelTotal] = useState(null);
  // 1. Agregar estado para el nivel seleccionado
  const [nivelGraficoSeleccionado, setNivelGraficoSeleccionado] = useState(null);
  // 1. Estado para el programa seleccionado
  const [programaGraficoSeleccionado, setProgramaGraficoSeleccionado] = useState(null);
  const [estadisticaDesercionPeriodo, setEstadisticaDesercionPeriodo] = useState([]);
  const [loadingDesercionPeriodo, setLoadingDesercionPeriodo] = useState(false);
  const [errorDesercionPeriodo, setErrorDesercionPeriodo] = useState(null);
  const [estadisticaDesercionFacultad, setEstadisticaDesercionFacultad] = useState([]);
  const [loadingDesercionFacultad, setLoadingDesercionFacultad] = useState(false);
  const [errorDesercionFacultad, setErrorDesercionFacultad] = useState(null);
  const [estadisticaDesercionPrograma, setEstadisticaDesercionPrograma] = useState([]);
  const [loadingDesercionPrograma, setLoadingDesercionPrograma] = useState(false);
  const [errorDesercionPrograma, setErrorDesercionPrograma] = useState(null);
  const [estadisticaDesercionNivel, setEstadisticaDesercionNivel] = useState([]);
  const [loadingDesercionNivel, setLoadingDesercionNivel] = useState(false);
  const [errorDesercionNivel, setErrorDesercionNivel] = useState(null);
  const [periodoGraficoDesercionSeleccionado, setPeriodoGraficoDesercionSeleccionado] = useState(null);
  const [facultadGraficoDesercionSeleccionada, setFacultadGraficoDesercionSeleccionada] = useState(null);
  const [programaGraficoDesercionSeleccionado, setProgramaGraficoDesercionSeleccionado] = useState(null);
  const [nivelGraficoDesercionSeleccionado, setNivelGraficoDesercionSeleccionado] = useState(null);
  const [estadisticaPrimiparosPeriodo, setEstadisticaPrimiparosPeriodo] = useState([]);
  const [loadingPrimiparosPeriodo, setLoadingPrimiparosPeriodo] = useState(false);
  const [errorPrimiparosPeriodo, setErrorPrimiparosPeriodo] = useState(null);
  const [estadisticaPrimiparosFacultad, setEstadisticaPrimiparosFacultad] = useState([]);
  const [loadingPrimiparosFacultad, setLoadingPrimiparosFacultad] = useState(false);
  const [errorPrimiparosFacultad, setErrorPrimiparosFacultad] = useState(null);
  const [estadisticaPrimiparosPrograma, setEstadisticaPrimiparosPrograma] = useState([]);
  const [loadingPrimiparosPrograma, setLoadingPrimiparosPrograma] = useState(false);
  const [errorPrimiparosPrograma, setErrorPrimiparosPrograma] = useState(null);
  const [estadisticaPrimiparosNivel, setEstadisticaPrimiparosNivel] = useState([]);
  const [loadingPrimiparosNivel, setLoadingPrimiparosNivel] = useState(false);
  const [errorPrimiparosNivel, setErrorPrimiparosNivel] = useState(null);
  const [periodoGraficoPrimiparosSeleccionado, setPeriodoGraficoPrimiparosSeleccionado] = useState(null);
  const [facultadGraficoPrimiparosSeleccionada, setFacultadGraficoPrimiparosSeleccionada] = useState(null);
  const [programaGraficoPrimiparosSeleccionado, setProgramaGraficoPrimiparosSeleccionado] = useState(null);
  const [nivelGraficoPrimiparosSeleccionado, setNivelGraficoPrimiparosSeleccionado] = useState(null);
  const [estadisticaGraduadosPeriodo, setEstadisticaGraduadosPeriodo] = useState([]);
  const [loadingGraduadosPeriodo, setLoadingGraduadosPeriodo] = useState(false);
  const [errorGraduadosPeriodo, setErrorGraduadosPeriodo] = useState(null);
  const [estadisticaGraduadosFacultad, setEstadisticaGraduadosFacultad] = useState([]);
  const [loadingGraduadosFacultad, setLoadingGraduadosFacultad] = useState(false);
  const [errorGraduadosFacultad, setErrorGraduadosFacultad] = useState(null);
  const [estadisticaGraduadosPrograma, setEstadisticaGraduadosPrograma] = useState([]);
  const [loadingGraduadosPrograma, setLoadingGraduadosPrograma] = useState(false);
  const [errorGraduadosPrograma, setErrorGraduadosPrograma] = useState(null);
  const [estadisticaGraduadosNivel, setEstadisticaGraduadosNivel] = useState([]);
  const [loadingGraduadosNivel, setLoadingGraduadosNivel] = useState(false);
  const [errorGraduadosNivel, setErrorGraduadosNivel] = useState(null);
  const [periodoGraficoGraduadosSeleccionado, setPeriodoGraficoGraduadosSeleccionado] = useState(null);
  const [facultadGraficoGraduadosSeleccionada, setFacultadGraficoGraduadosSeleccionada] = useState(null);
  const [programaGraficoGraduadosSeleccionado, setProgramaGraficoGraduadosSeleccionado] = useState(null);
  const [nivelGraficoGraduadosSeleccionado, setNivelGraficoGraduadosSeleccionado] = useState(null);
  const [estadisticaAusenciaPeriodo, setEstadisticaAusenciaPeriodo] = useState([]);
  const [loadingAusenciaPeriodo, setLoadingAusenciaPeriodo] = useState(false);
  const [errorAusenciaPeriodo, setErrorAusenciaPeriodo] = useState(null);
  const [estadisticaAusenciaFacultad, setEstadisticaAusenciaFacultad] = useState([]);
  const [loadingAusenciaFacultad, setLoadingAusenciaFacultad] = useState(false);
  const [errorAusenciaFacultad, setErrorAusenciaFacultad] = useState(null);
  const [estadisticaAusenciaPrograma, setEstadisticaAusenciaPrograma] = useState([]);
  const [loadingAusenciaPrograma, setLoadingAusenciaPrograma] = useState(false);
  const [errorAusenciaPrograma, setErrorAusenciaPrograma] = useState(null);
  const [estadisticaAusenciaNivel, setEstadisticaAusenciaNivel] = useState([]);
  const [loadingAusenciaNivel, setLoadingAusenciaNivel] = useState(false);
  const [errorAusenciaNivel, setErrorAusenciaNivel] = useState(null);
  const [periodoGraficoAusenciaSeleccionado, setPeriodoGraficoAusenciaSeleccionado] = useState(null);
  const [facultadGraficoAusenciaSeleccionada, setFacultadGraficoAusenciaSeleccionada] = useState(null);
  const [programaGraficoAusenciaSeleccionado, setProgramaGraficoAusenciaSeleccionado] = useState(null);
  const [nivelGraficoAusenciaSeleccionado, setNivelGraficoAusenciaSeleccionado] = useState(null);

  // Estados para Tasa de Deserción Promedio Acumulada
  const [periodosTasaDesercionPromedio, setPeriodosTasaDesercionPromedio] = useState([]);
  const [loadingTasaDesercionPromedio, setLoadingTasaDesercionPromedio] = useState(false);
  const [errorTasaDesercionPromedio, setErrorTasaDesercionPromedio] = useState(null);
  const [periodoSeleccionadoTasaPromedio, setPeriodoSeleccionadoTasaPromedio] = useState('');
  const [programasTasaDesercionPromedio, setProgramasTasaDesercionPromedio] = useState([]);
  const [programaSeleccionadoTasaPromedio, setProgramaSeleccionadoTasaPromedio] = useState('');
  const [datosTasaDesercionPromedio, setDatosTasaDesercionPromedio] = useState(null);
  const [loadingCalculoTasaPromedio, setLoadingCalculoTasaPromedio] = useState(false);
  const [ultimosParametrosTasaPromedio, setUltimosParametrosTasaPromedio] = useState(null);
  const [errorCalculoTasaPromedio, setErrorCalculoTasaPromedio] = useState(null);
  const periodoBaseTasaDesercionPromedio = useMemo(() => {
    if (periodoTasaDesercionPromedioGraficoSeleccionado) {
      return periodoTasaDesercionPromedioGraficoSeleccionado;
    }
    if (periodosTasaDesercionPromedio.length > 0) {
      return periodosTasaDesercionPromedio[0];
    }
    return null;
  }, [periodoTasaDesercionPromedioGraficoSeleccionado, periodosTasaDesercionPromedio]);

  // Estados para Tasa de Graduación Acumulada
  const [periodosTasaGraduacion, setPeriodosTasaGraduacion] = useState([]);
  const [loadingTasaGraduacion, setLoadingTasaGraduacion] = useState(false);
  const [errorTasaGraduacion, setErrorTasaGraduacion] = useState(null);
  const [periodoSeleccionadoTasaGraduacion, setPeriodoSeleccionadoTasaGraduacion] = useState('');
  const [programasTasaGraduacion, setProgramasTasaGraduacion] = useState([]);
  const [programaSeleccionadoTasaGraduacion, setProgramaSeleccionadoTasaGraduacion] = useState('');
  const [datosTasaGraduacion, setDatosTasaGraduacion] = useState(null);
  const [loadingCalculoTasaGraduacion, setLoadingCalculoTasaGraduacion] = useState(false);
  const [ultimosParametrosTasaGraduacion, setUltimosParametrosTasaGraduacion] = useState(null);
  const [errorCalculoTasaGraduacion, setErrorCalculoTasaGraduacion] = useState(null);
  const periodoBaseTasaGraduacion = useMemo(() => {
    if (periodoTasaGraduacionGraficoSeleccionado) {
      return periodoTasaGraduacionGraficoSeleccionado;
    }
    if (periodosTasaGraduacion.length > 0) {
      return periodosTasaGraduacion[0];
    }
    return null;
  }, [periodoTasaGraduacionGraficoSeleccionado, periodosTasaGraduacion]);
  // Estados para Tasa de Supervivencia
  const [periodosTasaSupervivencia, setPeriodosTasaSupervivencia] = useState([]);
  const [loadingTasaSupervivencia, setLoadingTasaSupervivencia] = useState(false);
  const [errorTasaSupervivencia, setErrorTasaSupervivencia] = useState(null);
  const [periodoSeleccionadoTasaSupervivencia, setPeriodoSeleccionadoTasaSupervivencia] = useState('');
  const [programasTasaSupervivencia, setProgramasTasaSupervivencia] = useState([]);
  const [programaSeleccionadoTasaSupervivencia, setProgramaSeleccionadoTasaSupervivencia] = useState('');
  const [datosTasaSupervivencia, setDatosTasaSupervivencia] = useState(null);
  const [loadingCalculoTasaSupervivencia, setLoadingCalculoTasaSupervivencia] = useState(false);
  const [ultimosParametrosTasaSupervivencia, setUltimosParametrosTasaSupervivencia] = useState(null);
  const [errorCalculoTasaSupervivencia, setErrorCalculoTasaSupervivencia] = useState(null);
  const [mostrarModalMatriculadosSupervivencia, setMostrarModalMatriculadosSupervivencia] = useState(false);
  const [listaMatriculadosSupervivencia, setListaMatriculadosSupervivencia] = useState([]);
  const [loadingMatriculadosSupervivencia, setLoadingMatriculadosSupervivencia] = useState(false);
  const [mostrarModalPrimiparosSupervivencia, setMostrarModalPrimiparosSupervivencia] = useState(false);
  const [listaPrimiparosSupervivencia, setListaPrimiparosSupervivencia] = useState([]);
  const [loadingPrimiparosSupervivencia, setLoadingPrimiparosSupervivencia] = useState(false);
  const periodoBaseTasaSupervivencia = useMemo(() => {
    if (periodoTasaSupervivenciaGraficoSeleccionado) {
      return periodoTasaSupervivenciaGraficoSeleccionado;
    }
    if (periodosTasaSupervivencia.length > 0) {
      return periodosTasaSupervivencia[0];
    }
    return null;
  }, [periodoTasaSupervivenciaGraficoSeleccionado, periodosTasaSupervivencia]);
  // Estados para Tasa deserción periodo 2.8
  const [periodosTasaDesercion28, setPeriodosTasaDesercion28] = useState([]);
  const [loadingTasaDesercion28, setLoadingTasaDesercion28] = useState(false);
  const [errorTasaDesercion28, setErrorTasaDesercion28] = useState(null);
  const [periodoSeleccionadoTasa28, setPeriodoSeleccionadoTasa28] = useState('');
  const [programasTasaDesercion28, setProgramasTasaDesercion28] = useState([]);
  const [programaSeleccionadoTasa28, setProgramaSeleccionadoTasa28] = useState('');
  const [datosTasaDesercion28, setDatosTasaDesercion28] = useState(null);
  const [loadingCalculoTasa28, setLoadingCalculoTasa28] = useState(false);
  const [errorCalculoTasa28, setErrorCalculoTasa28] = useState(null);
  const [mostrarModalDesertores28, setMostrarModalDesertores28] = useState(false);
  const [listaDesertores28, setListaDesertores28] = useState([]);
  const [loadingDesertores28, setLoadingDesertores28] = useState(false);
  const [mostrarModalMatriculados28, setMostrarModalMatriculados28] = useState(false);
  const [listaMatriculados28, setListaMatriculados28] = useState([]);
  const [loadingMatriculados28, setLoadingMatriculados28] = useState(false);
  const periodoBaseTasaDesercion28 = useMemo(() => {
    if (periodoTasaDesercion28GraficoSeleccionado) {
      return periodoTasaDesercion28GraficoSeleccionado;
    }
    if (periodosTasaDesercion28.length > 0) {
      return periodosTasaDesercion28[0];
    }
    return null;
  }, [periodoTasaDesercion28GraficoSeleccionado, periodosTasaDesercion28]);

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
      fetchPeriodos(token, true);
      fetchProgramas(token);
      fetchFacultades(token);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'matriculas' && token) {
      fetchMatriculas(token, periodoSeleccionado || '', programaMatriculas, facultadMatriculas);
    }
  }, [isAuthenticated, vista, token, periodoSeleccionado, programaMatriculas, facultadMatriculas, conCancelados]);

  useEffect(() => {
    if (isAuthenticated && vista === 'matriculas' && token) {
      fetchProgramasMatriculas(token, facultadMatriculas || '');
    }
  }, [isAuthenticated, vista, token, facultadMatriculas]);

  useEffect(() => {
    if (isAuthenticated && vista === 'desercion' && token) {
      fetchProgramasPorFacultad(token, facultadDesercion || '', setProgramasDesercion);
    }
  }, [isAuthenticated, vista, token, facultadDesercion]);

  useEffect(() => {
    if (isAuthenticated && vista === 'ausencia-intersemestral' && token) {
      fetchProgramasPorFacultad(token, facultadAusenciaIntersemestral || '', setProgramasAusencia);
    }
  }, [isAuthenticated, vista, token, facultadAusenciaIntersemestral]);

  useEffect(() => {
    if (isAuthenticated && vista === 'primiparos' && token) {
      fetchProgramasPorFacultad(token, facultadPrimiparos || '', setProgramasPrimiparos);
    }
  }, [isAuthenticated, vista, token, facultadPrimiparos]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graduados' && token) {
      fetchProgramasPorFacultad(token, facultadGraduados || '', setProgramasGraduados);
    }
  }, [isAuthenticated, vista, token, facultadGraduados]);

  useEffect(() => {
    if (isAuthenticated && vista === 'desercion') {
      fetchProgramas(token);
      if (periodos.length > 0 && !periodoDesercion) {
        setPeriodoDesercion(periodos[0]);
        fetchDesercion(token, periodos[0], programaDesercion, facultadDesercion);
      } else {
        fetchDesercion(token, periodoDesercion, programaDesercion, facultadDesercion);
      }
    }
  }, [isAuthenticated, vista, token, periodos, periodoDesercion, programaDesercion, facultadDesercion, conCancelados]);

  useEffect(() => {
    if (isAuthenticated && vista === 'ausencia-intersemestral') {
      fetchProgramas(token);
      if (periodos.length > 0 && !periodoAusenciaIntersemestral) {
        setPeriodoAusenciaIntersemestral(periodos[0]);
        fetchAusenciaIntersemestral(token, periodos[0], programaAusenciaIntersemestral, facultadAusenciaIntersemestral);
      } else {
        fetchAusenciaIntersemestral(token, periodoAusenciaIntersemestral, programaAusenciaIntersemestral, facultadAusenciaIntersemestral);
      }
    }
  }, [isAuthenticated, vista, token, periodos, periodoAusenciaIntersemestral, programaAusenciaIntersemestral, facultadAusenciaIntersemestral, conCancelados]);

  useEffect(() => {
    if (isAuthenticated && vista === 'primiparos') {
      fetchProgramas(token);
      if (periodos.length > 0 && !periodoPrimiparos) {
        setPeriodoPrimiparos(periodos[0]);
        fetchPrimiparos(token, periodos[0], programaPrimiparos, facultadPrimiparos);
      } else {
        fetchPrimiparos(token, periodoPrimiparos, programaPrimiparos, facultadPrimiparos);
      }
    }
  }, [isAuthenticated, vista, token, periodos, periodoPrimiparos, programaPrimiparos, facultadPrimiparos, conCancelados]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graduados') {
      fetchProgramas(token);
      if (periodos.length > 0 && !periodoGraduados) {
        setPeriodoGraduados(periodos[0]);
        fetchGraduados(token, periodos[0], programaGraduados, facultadGraduados);
      } else {
        fetchGraduados(token, periodoGraduados, programaGraduados, facultadGraduados);
      }
    }
  }, [isAuthenticated, vista, token, periodos, periodoGraduados, programaGraduados, facultadGraduados, conCancelados]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos' && graficoSeccion === 'matriculas') {
      fetchEstadistica(token, periodoGraficoSeleccionado, facultadGraficoSeleccionada, nivelGraficoSeleccionado, programaGraficoSeleccionado);
      // Los totales también deben actualizarse cuando cambia "Con Cancelados"
      fetchEstadisticaFacultadTotal(token);
      fetchEstadisticaProgramaTotal(token);
      fetchEstadisticaNivelTotal(token);
    }
  }, [isAuthenticated, vista, token, conCancelados, graficoSeccion, periodoGraficoSeleccionado, facultadGraficoSeleccionada, programaGraficoSeleccionado, nivelGraficoSeleccionado]);

  const scrollPeriodoChartToRight = (ref) => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth - el.clientWidth;
  };
  useEffect(() => {
    if (vista === 'graficos') {
      const run = () => {
        if (graficoSeccion === 'matriculas' && estadistica.length > 0) scrollPeriodoChartToRight(graficoMatriculasPeriodoScrollRef);
        if (graficoSeccion === 'desercion' && estadisticaDesercionPeriodo.length > 0) scrollPeriodoChartToRight(graficoDesercionPeriodoScrollRef);
        if (graficoSeccion === 'primiparos' && estadisticaPrimiparosPeriodo.length > 0) scrollPeriodoChartToRight(graficoPrimiparosPeriodoScrollRef);
        if (graficoSeccion === 'graduados' && estadisticaGraduadosPeriodo.length > 0) scrollPeriodoChartToRight(graficoGraduadosPeriodoScrollRef);
        if (graficoSeccion === 'ausencia-intersemestral' && estadisticaAusenciaPeriodo.length > 0) scrollPeriodoChartToRight(graficoAusenciaPeriodoScrollRef);
      };
      run();
      const t1 = setTimeout(run, 100);
      const t2 = setTimeout(run, 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [vista, graficoSeccion, estadistica, estadisticaDesercionPeriodo, estadisticaPrimiparosPeriodo, estadisticaGraduadosPeriodo, estadisticaAusenciaPeriodo]);

  useEffect(() => {
    if (vista && vista.startsWith('graficos-tasa')) {
      const run = () => {
        if (vista === 'graficos-tasa-desercion' && tasaDesercionPeriodoGrafico.length > 0) scrollPeriodoChartToRight(graficoTasaDesercionPeriodoScrollRef);
        if (vista === 'graficos-tasa-desercion-cohorte' && tasaDesercionCohortePeriodoGrafico.length > 0) scrollPeriodoChartToRight(graficoTasaDesercionCohortePeriodoScrollRef);
        if (vista === 'graficos-tasa-desercion-promedio' && tasaDesercionPromedioPeriodoGrafico.length > 0) scrollPeriodoChartToRight(graficoTasaDesercionPromedioPeriodoScrollRef);
        if (vista === 'graficos-tasa-graduacion' && tasaGraduacionPeriodoGrafico.length > 0) scrollPeriodoChartToRight(graficoTasaGraduacionPeriodoScrollRef);
        if (vista === 'graficos-tasa-ausencia-intersemestral' && tasaAusenciaPeriodoGrafico.length > 0) scrollPeriodoChartToRight(graficoTasaAusenciaPeriodoScrollRef);
        if (vista === 'graficos-tasa-supervivencia' && tasaSupervivenciaPeriodoGrafico.length > 0) scrollPeriodoChartToRight(graficoTasaSupervivenciaPeriodoScrollRef);
        if (vista === 'graficos-tasa-desercion-periodo-2-8' && tasaDesercion28PeriodoGrafico.length > 0) scrollPeriodoChartToRight(graficoTasaDesercion28PeriodoScrollRef);
      };
      run();
      const t1 = setTimeout(run, 100);
      const t2 = setTimeout(run, 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [vista, tasaDesercionPeriodoGrafico, tasaDesercionCohortePeriodoGrafico, tasaDesercionPromedioPeriodoGrafico, tasaGraduacionPeriodoGrafico, tasaAusenciaPeriodoGrafico, tasaSupervivenciaPeriodoGrafico, tasaDesercion28PeriodoGrafico]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos' && graficoSeccion === 'desercion') {
      // Mantener el gráfico de período completo, solo resaltar selección
      fetchEstadisticaDesercionPeriodo(
        token,
        null,
        facultadGraficoDesercionSeleccionada,
        programaGraficoDesercionSeleccionado,
        nivelGraficoDesercionSeleccionado
      );
      fetchEstadisticaDesercionFacultad(
        token,
        periodoGraficoDesercionSeleccionado,
        programaGraficoDesercionSeleccionado,
        nivelGraficoDesercionSeleccionado
      );
      fetchEstadisticaDesercionPrograma(
        token,
        periodoGraficoDesercionSeleccionado,
        facultadGraficoDesercionSeleccionada,
        nivelGraficoDesercionSeleccionado
      );
      fetchEstadisticaDesercionNivel(
        token,
        periodoGraficoDesercionSeleccionado,
        facultadGraficoDesercionSeleccionada,
        programaGraficoDesercionSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    graficoSeccion,
    periodoGraficoDesercionSeleccionado,
    facultadGraficoDesercionSeleccionada,
    programaGraficoDesercionSeleccionado,
    nivelGraficoDesercionSeleccionado,
    periodoGraficoPrimiparosSeleccionado,
    facultadGraficoPrimiparosSeleccionada,
    programaGraficoPrimiparosSeleccionado,
    nivelGraficoPrimiparosSeleccionado,
    periodoGraficoGraduadosSeleccionado,
    facultadGraficoGraduadosSeleccionada,
    programaGraficoGraduadosSeleccionado,
    nivelGraficoGraduadosSeleccionado,
    periodoGraficoAusenciaSeleccionado,
    facultadGraficoAusenciaSeleccionada,
    programaGraficoAusenciaSeleccionado,
    nivelGraficoAusenciaSeleccionado,
    periodoTasaDesercionGraficoSeleccionado,
    facultadTasaDesercionGraficoSeleccionada,
    programaTasaDesercionGraficoSeleccionado,
    nivelTasaDesercionGraficoSeleccionado
  ]);


  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-desercion') {
      fetchTasaDesercionPeriodoGrafico(
        token,
        facultadTasaDesercionGraficoSeleccionada,
        programaTasaDesercionGraficoSeleccionado,
        nivelTasaDesercionGraficoSeleccionado
      );
      fetchTasaDesercionFacultadGrafico(
        token,
        periodoTasaDesercionGraficoSeleccionado,
        programaTasaDesercionGraficoSeleccionado,
        nivelTasaDesercionGraficoSeleccionado
      );
      fetchTasaDesercionProgramaGrafico(
        token,
        periodoTasaDesercionGraficoSeleccionado,
        facultadTasaDesercionGraficoSeleccionada,
        nivelTasaDesercionGraficoSeleccionado
      );
      fetchTasaDesercionNivelGrafico(
        token,
        periodoTasaDesercionGraficoSeleccionado,
        facultadTasaDesercionGraficoSeleccionada,
        programaTasaDesercionGraficoSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    periodoTasaDesercionGraficoSeleccionado,
    facultadTasaDesercionGraficoSeleccionada,
    programaTasaDesercionGraficoSeleccionado,
    nivelTasaDesercionGraficoSeleccionado
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-desercion-cohorte') {
      fetchTasaDesercionCohortePeriodoGrafico(
        token,
        facultadTasaDesercionCohorteGraficoSeleccionada,
        programaTasaDesercionCohorteGraficoSeleccionado,
        nivelTasaDesercionCohorteGraficoSeleccionado
      );
      fetchTasaDesercionCohorteFacultadGrafico(
        token,
        cohorteBaseTasaDesercionCohorte,
        programaTasaDesercionCohorteGraficoSeleccionado,
        nivelTasaDesercionCohorteGraficoSeleccionado
      );
      fetchTasaDesercionCohorteProgramaGrafico(
        token,
        cohorteBaseTasaDesercionCohorte,
        facultadTasaDesercionCohorteGraficoSeleccionada,
        nivelTasaDesercionCohorteGraficoSeleccionado
      );
      fetchTasaDesercionCohorteNivelGrafico(
        token,
        cohorteBaseTasaDesercionCohorte,
        facultadTasaDesercionCohorteGraficoSeleccionada,
        programaTasaDesercionCohorteGraficoSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    periodoTasaDesercionCohorteGraficoSeleccionado,
    periodosTasaDesercionCohorte,
    facultadTasaDesercionCohorteGraficoSeleccionada,
    programaTasaDesercionCohorteGraficoSeleccionado,
    nivelTasaDesercionCohorteGraficoSeleccionado,
    cohorteBaseTasaDesercionCohorte
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-desercion-promedio') {
      fetchTasaDesercionPromedioPeriodoGrafico(
        token,
        facultadTasaDesercionPromedioGraficoSeleccionada,
        programaTasaDesercionPromedioGraficoSeleccionado,
        nivelTasaDesercionPromedioGraficoSeleccionado
      );
      fetchTasaDesercionPromedioFacultadGrafico(
        token,
        periodoBaseTasaDesercionPromedio,
        programaTasaDesercionPromedioGraficoSeleccionado,
        nivelTasaDesercionPromedioGraficoSeleccionado
      );
      fetchTasaDesercionPromedioProgramaGrafico(
        token,
        periodoBaseTasaDesercionPromedio,
        facultadTasaDesercionPromedioGraficoSeleccionada,
        nivelTasaDesercionPromedioGraficoSeleccionado
      );
      fetchTasaDesercionPromedioNivelGrafico(
        token,
        periodoBaseTasaDesercionPromedio,
        facultadTasaDesercionPromedioGraficoSeleccionada,
        programaTasaDesercionPromedioGraficoSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    periodoTasaDesercionPromedioGraficoSeleccionado,
    facultadTasaDesercionPromedioGraficoSeleccionada,
    programaTasaDesercionPromedioGraficoSeleccionado,
    nivelTasaDesercionPromedioGraficoSeleccionado,
    periodoBaseTasaDesercionPromedio,
    periodosTasaDesercionPromedio
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-graduacion') {
      fetchTasaGraduacionPeriodoGrafico(
        token,
        facultadTasaGraduacionGraficoSeleccionada,
        programaTasaGraduacionGraficoSeleccionado,
        nivelTasaGraduacionGraficoSeleccionado
      );
      fetchTasaGraduacionFacultadGrafico(
        token,
        periodoBaseTasaGraduacion,
        programaTasaGraduacionGraficoSeleccionado,
        nivelTasaGraduacionGraficoSeleccionado
      );
      fetchTasaGraduacionProgramaGrafico(
        token,
        periodoBaseTasaGraduacion,
        facultadTasaGraduacionGraficoSeleccionada,
        nivelTasaGraduacionGraficoSeleccionado
      );
      fetchTasaGraduacionNivelGrafico(
        token,
        periodoBaseTasaGraduacion,
        facultadTasaGraduacionGraficoSeleccionada,
        programaTasaGraduacionGraficoSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    periodoTasaGraduacionGraficoSeleccionado,
    facultadTasaGraduacionGraficoSeleccionada,
    programaTasaGraduacionGraficoSeleccionado,
    nivelTasaGraduacionGraficoSeleccionado,
    periodoBaseTasaGraduacion,
    periodosTasaGraduacion
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-ausencia-intersemestral') {
      fetchTasaAusenciaPeriodoGrafico(
        token,
        facultadTasaAusenciaGraficoSeleccionada,
        programaTasaAusenciaGraficoSeleccionado,
        nivelTasaAusenciaGraficoSeleccionado
      );
      fetchTasaAusenciaFacultadGrafico(
        token,
        periodoTasaAusenciaGraficoSeleccionado,
        programaTasaAusenciaGraficoSeleccionado,
        nivelTasaAusenciaGraficoSeleccionado
      );
      fetchTasaAusenciaProgramaGrafico(
        token,
        periodoTasaAusenciaGraficoSeleccionado,
        facultadTasaAusenciaGraficoSeleccionada,
        nivelTasaAusenciaGraficoSeleccionado
      );
      fetchTasaAusenciaNivelGrafico(
        token,
        periodoTasaAusenciaGraficoSeleccionado,
        facultadTasaAusenciaGraficoSeleccionada,
        programaTasaAusenciaGraficoSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    periodoTasaAusenciaGraficoSeleccionado,
    facultadTasaAusenciaGraficoSeleccionada,
    programaTasaAusenciaGraficoSeleccionado,
    nivelTasaAusenciaGraficoSeleccionado
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-supervivencia') {
      fetchTasaSupervivenciaPeriodoGrafico(
        token,
        facultadTasaSupervivenciaGraficoSeleccionada,
        programaTasaSupervivenciaGraficoSeleccionado,
        nivelTasaSupervivenciaGraficoSeleccionado
      );
      fetchTasaSupervivenciaFacultadGrafico(
        token,
        periodoTasaSupervivenciaGraficoSeleccionado,
        programaTasaSupervivenciaGraficoSeleccionado,
        nivelTasaSupervivenciaGraficoSeleccionado
      );
      fetchTasaSupervivenciaProgramaGrafico(
        token,
        periodoTasaSupervivenciaGraficoSeleccionado,
        facultadTasaSupervivenciaGraficoSeleccionada,
        nivelTasaSupervivenciaGraficoSeleccionado
      );
      fetchTasaSupervivenciaNivelGrafico(
        token,
        periodoTasaSupervivenciaGraficoSeleccionado,
        facultadTasaSupervivenciaGraficoSeleccionada,
        programaTasaSupervivenciaGraficoSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    periodoTasaSupervivenciaGraficoSeleccionado,
    facultadTasaSupervivenciaGraficoSeleccionada,
    programaTasaSupervivenciaGraficoSeleccionado,
    nivelTasaSupervivenciaGraficoSeleccionado
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-desercion-periodo-2-8') {
      fetchTasaDesercion28PeriodoGrafico(
        token,
        facultadTasaDesercion28GraficoSeleccionada,
        programaTasaDesercion28GraficoSeleccionado,
        nivelTasaDesercion28GraficoSeleccionado
      );
      fetchTasaDesercion28FacultadGrafico(
        token,
        periodoTasaDesercion28GraficoSeleccionado,
        programaTasaDesercion28GraficoSeleccionado,
        nivelTasaDesercion28GraficoSeleccionado
      );
      fetchTasaDesercion28ProgramaGrafico(
        token,
        periodoTasaDesercion28GraficoSeleccionado,
        facultadTasaDesercion28GraficoSeleccionada,
        nivelTasaDesercion28GraficoSeleccionado
      );
      fetchTasaDesercion28NivelGrafico(
        token,
        periodoTasaDesercion28GraficoSeleccionado,
        facultadTasaDesercion28GraficoSeleccionada,
        programaTasaDesercion28GraficoSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    periodoTasaDesercion28GraficoSeleccionado,
    facultadTasaDesercion28GraficoSeleccionada,
    programaTasaDesercion28GraficoSeleccionado,
    nivelTasaDesercion28GraficoSeleccionado
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'tasa-desercion') {
      fetchPeriodosTasaDesercion(token);
      fetchProgramasTasaDesercion(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'tasa-desercion-promedio') {
      fetchPeriodosTasaDesercionPromedio(token);
      fetchProgramasTasaDesercionPromedio(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-desercion-promedio') {
      fetchPeriodosTasaDesercionPromedio(token);
      fetchProgramasTasaDesercionPromedio(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'tasa-graduacion') {
      fetchPeriodosTasaGraduacion(token);
      fetchProgramasTasaGraduacion(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-graduacion') {
      fetchPeriodosTasaGraduacion(token);
      fetchProgramasTasaGraduacion(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'tasa-ausencia-intersemestral') {
      fetchPeriodosTasaAusencia(token);
      fetchProgramasTasaAusencia(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-ausencia-intersemestral') {
      fetchPeriodosTasaAusencia(token);
      fetchProgramasTasaAusencia(token);
    }
  }, [isAuthenticated, vista, token]);

  // Calcular tasa de ausencia intersemestral automáticamente cuando se cargan los períodos o cambia el período seleccionado
  useEffect(() => {
    if (periodosTasaAusencia.length > 0) {
      // Usar el período seleccionado si existe, sino usar el primero de la lista
      const periodoActual = periodoSeleccionadoTasaAusencia || periodosTasaAusencia[0];
      const programaActual = programaSeleccionadoTasaAusencia || '';
      if (periodoActual) {
        calcularTasaAusenciaIntersemestral(token, periodoActual, programaActual);
      }
    }
  }, [periodosTasaAusencia, periodoSeleccionadoTasaAusencia, programaSeleccionadoTasaAusencia, token]);

  // Recalcular tasa de ausencia intersemestral cuando cambia conCancelados
  useEffect(() => {
    if (vista === 'tasa-ausencia-intersemestral' && periodosTasaAusencia.length > 0) {
      const periodoActual = periodoSeleccionadoTasaAusencia || periodosTasaAusencia[0];
      const programaActual = programaSeleccionadoTasaAusencia || '';
      if (periodoActual) {
        calcularTasaAusenciaIntersemestral(token, periodoActual, programaActual);
      }
    }
  }, [conCancelados, vista, periodosTasaAusencia, periodoSeleccionadoTasaAusencia, programaSeleccionadoTasaAusencia, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'tasa-desercion-cohorte') {
      fetchPeriodosTasaDesercionCohorte(token);
      fetchProgramasTasaDesercionCohorte(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-desercion-cohorte') {
      fetchPeriodosTasaDesercionCohorte(token);
      fetchProgramasTasaDesercionCohorte(token);
    }
  }, [isAuthenticated, vista, token]);

  // Calcular tasa de deserción automáticamente cuando se cargan los períodos
  useEffect(() => {
    if (periodosTasaDesercion.length > 0 && !programaSeleccionadoTasa) {
      const periodoActual = periodosTasaDesercion[0];
      calcularTasaDesercion(token, periodoActual, '');
    }
  }, [periodosTasaDesercion, programaSeleccionadoTasa, token]);

  // Recalcular tasa de deserción anual cuando cambia conCancelados
  useEffect(() => {
    if (vista === 'tasa-desercion' && periodosTasaDesercion.length > 0) {
      const periodoActual = periodoSeleccionadoTasa || periodosTasaDesercion[0];
      const programaActual = programaSeleccionadoTasa || '';
      calcularTasaDesercion(token, periodoActual, programaActual);
    }
  }, [conCancelados, vista, periodosTasaDesercion, periodoSeleccionadoTasa, programaSeleccionadoTasa, token]);

  // Calcular tasa de deserción por cohorte automáticamente cuando se cargan los períodos
  useEffect(() => {
    if (periodosTasaDesercionCohorte.length > 0 && !programaSeleccionadoCohorte && !cohorteSeleccionada) {
      const cohorteActual = periodosTasaDesercionCohorte[0];
      setCohorteSeleccionada(cohorteActual);
      calcularTasaDesercionCohorte(token, cohorteActual, '');
    }
  }, [periodosTasaDesercionCohorte, programaSeleccionadoCohorte, cohorteSeleccionada, token]);

  // Recalcular tasa de deserción por cohorte cuando cambia conCancelados
  useEffect(() => {
    if (vista === 'tasa-desercion-cohorte' && periodosTasaDesercionCohorte.length > 0 && cohorteSeleccionada) {
      const programaActual = programaSeleccionadoCohorte || '';
      const semestreActual = periodoSeleccionadoCohorte || null;
      calcularTasaDesercionCohorte(token, cohorteSeleccionada, programaActual, semestreActual);
    }
  }, [conCancelados, vista, periodosTasaDesercionCohorte, cohorteSeleccionada, programaSeleccionadoCohorte, periodoSeleccionadoCohorte, token]);

  // Calcular tasa de deserción promedio automáticamente cuando se cargan los períodos o cambia el período seleccionado
  useEffect(() => {
    if (periodosTasaDesercionPromedio.length > 0) {
      // Usar el período seleccionado si existe, sino usar el primero de la lista
      const periodoActual = periodoSeleccionadoTasaPromedio || periodosTasaDesercionPromedio[0];
      const programaActual = programaSeleccionadoTasaPromedio || '';
      if (periodoActual) {
        calcularTasaDesercionPromedio(token, periodoActual, programaActual);
      }
    }
  }, [periodosTasaDesercionPromedio, periodoSeleccionadoTasaPromedio, programaSeleccionadoTasaPromedio, token]);

  // Recalcular tasa de deserción promedio acumulada cuando cambia conCancelados
  useEffect(() => {
    if (vista === 'tasa-desercion-promedio' && periodosTasaDesercionPromedio.length > 0) {
      const periodoActual = periodoSeleccionadoTasaPromedio || periodosTasaDesercionPromedio[0];
      const programaActual = programaSeleccionadoTasaPromedio || '';
      if (periodoActual) {
        calcularTasaDesercionPromedio(token, periodoActual, programaActual);
      }
    }
  }, [conCancelados, vista, periodosTasaDesercionPromedio, periodoSeleccionadoTasaPromedio, programaSeleccionadoTasaPromedio, token]);

  // Calcular tasa de graduación automáticamente cuando se cargan los períodos
  // Calcular tasa de graduación automáticamente cuando se cargan los períodos o cambia el período seleccionado
  useEffect(() => {
    if (periodosTasaGraduacion.length > 0) {
      // Usar el período seleccionado si existe, sino usar el primero de la lista
      const periodoActual = periodoSeleccionadoTasaGraduacion || periodosTasaGraduacion[0];
      const programaActual = programaSeleccionadoTasaGraduacion || '';
      if (periodoActual) {
        calcularTasaGraduacion(token, periodoActual, programaActual);
      }
    }
  }, [periodosTasaGraduacion, periodoSeleccionadoTasaGraduacion, programaSeleccionadoTasaGraduacion, token]);

  // Recalcular tasa de graduación acumulada cuando cambia conCancelados
  useEffect(() => {
    if (vista === 'tasa-graduacion' && periodosTasaGraduacion.length > 0) {
      const periodoActual = periodoSeleccionadoTasaGraduacion || periodosTasaGraduacion[0];
      const programaActual = programaSeleccionadoTasaGraduacion || '';
      if (periodoActual) {
        calcularTasaGraduacion(token, periodoActual, programaActual);
      }
    }
  }, [conCancelados, vista, periodosTasaGraduacion, periodoSeleccionadoTasaGraduacion, programaSeleccionadoTasaGraduacion, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'tasa-supervivencia') {
      fetchPeriodosTasaSupervivencia(token);
      fetchProgramasTasaSupervivencia(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-supervivencia') {
      fetchPeriodosTasaSupervivencia(token);
      fetchProgramasTasaSupervivencia(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'tasa-desercion-periodo-2-8') {
      fetchPeriodosTasaDesercion28(token);
      fetchProgramasTasaDesercion28(token);
    }
  }, [isAuthenticated, vista, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos-tasa-desercion-periodo-2-8') {
      fetchPeriodosTasaDesercion28(token);
      fetchProgramasTasaDesercion28(token);
    }
  }, [isAuthenticated, vista, token]);

  // Calcular tasa de supervivencia automáticamente cuando se cargan los períodos o cambia el período seleccionado
  useEffect(() => {
    if (periodosTasaSupervivencia.length > 0) {
      // Usar el período seleccionado si existe, sino usar el primero de la lista
      const periodoActual = periodoSeleccionadoTasaSupervivencia || periodosTasaSupervivencia[0];
      const programaActual = programaSeleccionadoTasaSupervivencia || '';
      if (periodoActual) {
        calcularTasaSupervivencia(token, periodoActual, programaActual);
      }
    }
  }, [periodosTasaSupervivencia, periodoSeleccionadoTasaSupervivencia, programaSeleccionadoTasaSupervivencia, token]);

  // Recalcular tasa de supervivencia cuando cambia conCancelados
  useEffect(() => {
    if (vista === 'tasa-supervivencia' && periodosTasaSupervivencia.length > 0) {
      const periodoActual = periodoSeleccionadoTasaSupervivencia || periodosTasaSupervivencia[0];
      const programaActual = programaSeleccionadoTasaSupervivencia || '';
      if (periodoActual) {
        calcularTasaSupervivencia(token, periodoActual, programaActual);
      }
    }
  }, [conCancelados, vista, periodosTasaSupervivencia, periodoSeleccionadoTasaSupervivencia, programaSeleccionadoTasaSupervivencia, token]);

  // Calcular tasa de deserción periodo 2.8 automáticamente cuando se cargan los períodos o cambia el período seleccionado
  useEffect(() => {
    if (periodosTasaDesercion28.length > 0) {
      // Usar el período seleccionado si existe, sino usar el primero de la lista
      const periodoActual = periodoSeleccionadoTasa28 || periodosTasaDesercion28[0];
      const programaActual = programaSeleccionadoTasa28 || '';
      if (periodoActual) {
        calcularTasaDesercion28(token, periodoActual, programaActual);
      }
    }
  }, [periodosTasaDesercion28, periodoSeleccionadoTasa28, programaSeleccionadoTasa28, token]);

  // Recalcular tasa de deserción periodo 2.8 cuando cambia conCancelados
  useEffect(() => {
    if (vista === 'tasa-desercion-periodo-2-8' && periodosTasaDesercion28.length > 0) {
      const periodoActual = periodoSeleccionadoTasa28 || periodosTasaDesercion28[0];
      const programaActual = programaSeleccionadoTasa28 || '';
      if (periodoActual) {
        calcularTasaDesercion28(token, periodoActual, programaActual);
      }
    }
  }, [conCancelados, vista, periodosTasaDesercion28, periodoSeleccionadoTasa28, programaSeleccionadoTasa28, token]);

  useEffect(() => {
    if (isAuthenticated && vista === 'riesgo-desercion') {
      fetchProgramasPorFacultad(token, riesgoFacultad, setProgramasRiesgo);
      fetchRiesgoDesercion(token, 'actual', riesgoUmbral, riesgoFacultad, riesgoPrograma);
    }
  }, [isAuthenticated, vista, token, riesgoUmbral, riesgoFacultad, riesgoPrograma]);

  useEffect(() => {
    if (isAuthenticated && vista === 'configuracion' && puedeAdministrar && token) {
      fetchConfigUsuarios();
    }
  }, [isAuthenticated, vista, puedeAdministrar, token]);

  useEffect(() => {
    localStorage.setItem('modoOscuro', modoOscuro ? 'true' : 'false');
  }, [modoOscuro]);

  useEffect(() => {
    if (modoOscuro) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }
  }, [modoOscuro]);

  // 2. useEffect para cargar datos de todos los gráficos según los filtros activos
  useEffect(() => {
    if (isAuthenticated && vista === 'graficos') {
      // Periodos
      fetchEstadistica(token, periodoGraficoSeleccionado, facultadGraficoSeleccionada, nivelGraficoSeleccionado, programaGraficoSeleccionado);
      // Facultades
      fetchEstadisticaFacultad(token, periodoGraficoSeleccionado, nivelGraficoSeleccionado, programaGraficoSeleccionado);
      // Programas
      fetchEstadisticaPrograma(token, periodoGraficoSeleccionado, facultadGraficoSeleccionada, nivelGraficoSeleccionado);
      // Niveles
      fetchEstadisticaNivel(token, periodoGraficoSeleccionado, facultadGraficoSeleccionada, programaGraficoSeleccionado);
    }
    // eslint-disable-next-line
  }, [isAuthenticated, vista, token, periodoGraficoSeleccionado, facultadGraficoSeleccionada, nivelGraficoSeleccionado, programaGraficoSeleccionado, conCancelados]);

  // useEffect para cargar los totales al entrar a la vista de gráficos (sin filtros)
  useEffect(() => {
    if (isAuthenticated && vista === 'graficos' && !periodoGraficoSeleccionado && !facultadGraficoSeleccionada && !programaGraficoSeleccionado && !nivelGraficoSeleccionado) {
      fetchEstadisticaNivelTotal(token);
    }
    // eslint-disable-next-line
  }, [isAuthenticated, vista, token, periodoGraficoSeleccionado, facultadGraficoSeleccionada, programaGraficoSeleccionado, nivelGraficoSeleccionado, conCancelados]);

  const fetchPeriodos = (jwt, autoSelectLatest) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/periodos'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setPeriodos(response.data);
        if (autoSelectLatest && response.data.length > 0) {
          setPeriodoSeleccionado(response.data[0]);
          // El useEffect se encargará de recargar las matrículas cuando cambie periodoSeleccionado
        }
      })
      .catch(error => {
        setError('Error al obtener los periodos');
      });
  };

  const fetchFacultades = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/facultades'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setFacultades(response.data);
      })
      .catch(error => {
        setError('Error al obtener las facultades');
      });
  };

  const fetchMatriculas = (jwt, periodo, programa, facultad) => {
    setLoading(true);
    setError(null);
    let url = buildApiUrl('/apiDesercion/matriculas');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setMatriculas(response.data);
        setLoading(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setError('Error al obtener los datos o sesión expirada');
        }
        setLoading(false);
      });
  };

  const fetchRiesgoDesercion = (jwt, periodo, umbral, facultad, programa) => {
    setLoadingRiesgo(true);
    setErrorRiesgo(null);
    let url = buildApiUrl('/apiDesercion/desercion/riesgo-desercion');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (umbral !== null && umbral !== undefined && umbral !== '') params.push(`umbral=${encodeURIComponent(umbral)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setRiesgoLista(response.data.results || []);
        setLoadingRiesgo(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorRiesgo('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          const message = error.response?.data?.error || 'Error al obtener predicciones';
          setErrorRiesgo(message);
        }
        setLoadingRiesgo(false);
      });
  };

  const fetchMatriculasGraficos = (jwt, periodo, programa, facultad, nivel) => {
    setLoadingMatriculasGraficos(true);
    setErrorMatriculasGraficos(null);
    let url = buildApiUrl('/apiDesercion/matriculas');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push('sinLimite=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setListaMatriculasGraficos(response.data);
        setLoadingMatriculasGraficos(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorMatriculasGraficos('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorMatriculasGraficos('Error al obtener los datos de matrículas');
        }
        setLoadingMatriculasGraficos(false);
      });
  };

  const fetchProgramas = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/programas'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setProgramas(response.data);
      })
      .catch(error => {
        setError('Error al obtener los programas');
      });
  };

  const fetchProgramasMatriculas = (jwt, facultad) => {
    let url = buildApiUrl('/apiDesercion/matriculas/programas');
    if (facultad) url += `?facultad=${encodeURIComponent(facultad)}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setProgramasMatriculas(response.data);
      })
      .catch(() => {
        setProgramasMatriculas([]);
      });
  };

  const fetchFacultadDePrograma = (jwt, programa, setFacultad = setFacultadMatriculas) => {
    if (!programa) return;
    const url = buildApiUrl('/apiDesercion/matriculas/facultad-de-programa') + `?programa=${encodeURIComponent(programa)}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        if (response.data && response.data.facultad) {
          setFacultad(response.data.facultad);
        }
      })
      .catch(() => {});
  };

  const fetchProgramasPorFacultad = (jwt, facultad, setProgramas) => {
    let url = buildApiUrl('/apiDesercion/matriculas/programas');
    if (facultad) url += `?facultad=${encodeURIComponent(facultad)}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => setProgramas(response.data || []))
      .catch(() => setProgramas([]));
  };

  const fetchDesercion = (jwt, periodo, programa, facultad) => {
    setLoadingDesercion(true);
    setErrorDesercion(null);
    let url = buildApiUrl('/apiDesercion/desercion');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setDesercion(response.data);
        setLoadingDesercion(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorDesercion('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorDesercion('Error al obtener los datos de deserción');
        }
        setLoadingDesercion(false);
      });
  };

  const fetchDesercionGraficos = (jwt, periodo, programa, facultad, nivel) => {
    setLoadingDesercionGraficos(true);
    setErrorDesercionGraficos(null);
    let url = buildApiUrl('/apiDesercion/desercion');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setListaDesercionGraficos(response.data);
        setLoadingDesercionGraficos(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorDesercionGraficos('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorDesercionGraficos('Error al obtener los datos de deserción');
        }
        setLoadingDesercionGraficos(false);
      });
  };

  const fetchPrimiparosGraficos = (jwt, periodo, programa, facultad, nivel) => {
    setLoadingPrimiparosGraficos(true);
    setErrorPrimiparosGraficos(null);
    let url = buildApiUrl('/apiDesercion/matriculas/primiparos');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setListaPrimiparosGraficos(response.data);
        setLoadingPrimiparosGraficos(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorPrimiparosGraficos('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorPrimiparosGraficos('Error al obtener los datos de primíparos');
        }
        setLoadingPrimiparosGraficos(false);
      });
  };

  const fetchGraduadosGraficos = (jwt, periodo, programa, facultad, nivel) => {
    setLoadingGraduadosGraficos(true);
    setErrorGraduadosGraficos(null);
    let url = buildApiUrl('/apiDesercion/matriculas/graduados');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setListaGraduadosGraficos(response.data);
        setLoadingGraduadosGraficos(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorGraduadosGraficos('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorGraduadosGraficos('Error al obtener los datos de graduados');
        }
        setLoadingGraduadosGraficos(false);
      });
  };

  const fetchAusenciaGraficos = (jwt, periodo, programa, facultad, nivel) => {
    setLoadingAusenciaGraficos(true);
    setErrorAusenciaGraficos(null);
    let url = buildApiUrl('/apiDesercion/desercion/ausencia-intersemestral');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setListaAusenciaGraficos(response.data);
        setLoadingAusenciaGraficos(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorAusenciaGraficos('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorAusenciaGraficos('Error al obtener los datos de ausencia intersemestral');
        }
        setLoadingAusenciaGraficos(false);
      });
  };

  const fetchTasaDesercionPeriodoGrafico = (jwt, facultad, programa, nivel) => {
    setLoadingTasaDesercionPeriodoGrafico(true);
    setErrorTasaDesercionPeriodoGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion/estadistica-periodo');
    const params = [];
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionPeriodoGrafico(response.data);
        setLoadingTasaDesercionPeriodoGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionPeriodoGrafico('Error al obtener la tasa de deserción por período');
        setLoadingTasaDesercionPeriodoGrafico(false);
      });
  };

  const fetchTasaDesercionFacultadGrafico = (jwt, periodo, programa, nivel) => {
    setLoadingTasaDesercionFacultadGrafico(true);
    setErrorTasaDesercionFacultadGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionFacultadGrafico(response.data);
        setLoadingTasaDesercionFacultadGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionFacultadGrafico('Error al obtener la tasa de deserción por facultad');
        setLoadingTasaDesercionFacultadGrafico(false);
      });
  };

  const fetchTasaDesercionProgramaGrafico = (jwt, periodo, facultad, nivel) => {
    setLoadingTasaDesercionProgramaGrafico(true);
    setErrorTasaDesercionProgramaGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionProgramaGrafico(response.data);
        setLoadingTasaDesercionProgramaGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionProgramaGrafico('Error al obtener la tasa de deserción por programa');
        setLoadingTasaDesercionProgramaGrafico(false);
      });
  };

  const fetchTasaDesercionNivelGrafico = (jwt, periodo, facultad, programa) => {
    setLoadingTasaDesercionNivelGrafico(true);
    setErrorTasaDesercionNivelGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionNivelGrafico(response.data);
        setLoadingTasaDesercionNivelGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionNivelGrafico('Error al obtener la tasa de deserción por nivel');
        setLoadingTasaDesercionNivelGrafico(false);
      });
  };

  const fetchTasaDesercionCohortePeriodoGrafico = (jwt, facultad, programa, nivel, semestre) => {
    setLoadingTasaDesercionCohortePeriodoGrafico(true);
    setErrorTasaDesercionCohortePeriodoGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-cohorte/estadistica-periodo');
    const params = [];
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (semestre) params.push(`semestre=${encodeURIComponent(semestre)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionCohortePeriodoGrafico(response.data);
        setLoadingTasaDesercionCohortePeriodoGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionCohortePeriodoGrafico('Error al obtener la tasa de deserción por cohorte (periodo)');
        setLoadingTasaDesercionCohortePeriodoGrafico(false);
      });
  };

  const fetchTasaDesercionCohorteFacultadGrafico = (jwt, cohorte, programa, nivel, semestre) => {
    setLoadingTasaDesercionCohorteFacultadGrafico(true);
    setErrorTasaDesercionCohorteFacultadGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-cohorte/estadistica-facultad');
    const params = [];
    if (cohorte) params.push(`cohorte=${encodeURIComponent(cohorte)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (semestre) params.push(`semestre=${encodeURIComponent(semestre)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionCohorteFacultadGrafico(response.data);
        setLoadingTasaDesercionCohorteFacultadGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionCohorteFacultadGrafico('Error al obtener la tasa de deserción por cohorte (facultad)');
        setLoadingTasaDesercionCohorteFacultadGrafico(false);
      });
  };

  const fetchTasaDesercionCohorteProgramaGrafico = (jwt, cohorte, facultad, nivel, semestre) => {
    setLoadingTasaDesercionCohorteProgramaGrafico(true);
    setErrorTasaDesercionCohorteProgramaGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-cohorte/estadistica-programa');
    const params = [];
    if (cohorte) params.push(`cohorte=${encodeURIComponent(cohorte)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (semestre) params.push(`semestre=${encodeURIComponent(semestre)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionCohorteProgramaGrafico(response.data);
        setLoadingTasaDesercionCohorteProgramaGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionCohorteProgramaGrafico('Error al obtener la tasa de deserción por cohorte (programa)');
        setLoadingTasaDesercionCohorteProgramaGrafico(false);
      });
  };

  const fetchTasaDesercionCohorteNivelGrafico = (jwt, cohorte, facultad, programa, semestre) => {
    setLoadingTasaDesercionCohorteNivelGrafico(true);
    setErrorTasaDesercionCohorteNivelGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-cohorte/estadistica-nivel');
    const params = [];
    if (cohorte) params.push(`cohorte=${encodeURIComponent(cohorte)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (semestre) params.push(`semestre=${encodeURIComponent(semestre)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionCohorteNivelGrafico(response.data);
        setLoadingTasaDesercionCohorteNivelGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionCohorteNivelGrafico('Error al obtener la tasa de deserción por cohorte (nivel)');
        setLoadingTasaDesercionCohorteNivelGrafico(false);
      });
  };

  const fetchTasaDesercionPromedioPeriodoGrafico = (jwt, facultad, programa, nivel) => {
    setLoadingTasaDesercionPromedioPeriodoGrafico(true);
    setErrorTasaDesercionPromedioPeriodoGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-promedio/estadistica-periodo');
    const params = [];
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionPromedioPeriodoGrafico(response.data);
        setLoadingTasaDesercionPromedioPeriodoGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionPromedioPeriodoGrafico('Error al obtener la tasa de deserción promedio (periodo)');
        setLoadingTasaDesercionPromedioPeriodoGrafico(false);
      });
  };

  const fetchTasaDesercionPromedioFacultadGrafico = (jwt, periodo, programa, nivel) => {
    setLoadingTasaDesercionPromedioFacultadGrafico(true);
    setErrorTasaDesercionPromedioFacultadGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-promedio/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionPromedioFacultadGrafico(response.data);
        setLoadingTasaDesercionPromedioFacultadGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionPromedioFacultadGrafico('Error al obtener la tasa de deserción promedio (facultad)');
        setLoadingTasaDesercionPromedioFacultadGrafico(false);
      });
  };

  const fetchTasaDesercionPromedioProgramaGrafico = (jwt, periodo, facultad, nivel) => {
    setLoadingTasaDesercionPromedioProgramaGrafico(true);
    setErrorTasaDesercionPromedioProgramaGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-promedio/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionPromedioProgramaGrafico(response.data);
        setLoadingTasaDesercionPromedioProgramaGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionPromedioProgramaGrafico('Error al obtener la tasa de deserción promedio (programa)');
        setLoadingTasaDesercionPromedioProgramaGrafico(false);
      });
  };

  const fetchTasaDesercionPromedioNivelGrafico = (jwt, periodo, facultad, programa) => {
    setLoadingTasaDesercionPromedioNivelGrafico(true);
    setErrorTasaDesercionPromedioNivelGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-promedio/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercionPromedioNivelGrafico(response.data);
        setLoadingTasaDesercionPromedioNivelGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercionPromedioNivelGrafico('Error al obtener la tasa de deserción promedio (nivel)');
        setLoadingTasaDesercionPromedioNivelGrafico(false);
      });
  };

  const fetchTasaGraduacionPeriodoGrafico = (jwt, facultad, programa, nivel) => {
    setLoadingTasaGraduacionPeriodoGrafico(true);
    setErrorTasaGraduacionPeriodoGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-graduacion/estadistica-periodo');
    const params = [];
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaGraduacionPeriodoGrafico(response.data);
        setLoadingTasaGraduacionPeriodoGrafico(false);
      })
      .catch(() => {
        setErrorTasaGraduacionPeriodoGrafico('Error al obtener la tasa de graduación (periodo)');
        setLoadingTasaGraduacionPeriodoGrafico(false);
      });
  };

  const fetchTasaGraduacionFacultadGrafico = (jwt, periodo, programa, nivel) => {
    setLoadingTasaGraduacionFacultadGrafico(true);
    setErrorTasaGraduacionFacultadGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-graduacion/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaGraduacionFacultadGrafico(response.data);
        setLoadingTasaGraduacionFacultadGrafico(false);
      })
      .catch(() => {
        setErrorTasaGraduacionFacultadGrafico('Error al obtener la tasa de graduación (facultad)');
        setLoadingTasaGraduacionFacultadGrafico(false);
      });
  };

  const fetchTasaGraduacionProgramaGrafico = (jwt, periodo, facultad, nivel) => {
    setLoadingTasaGraduacionProgramaGrafico(true);
    setErrorTasaGraduacionProgramaGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-graduacion/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaGraduacionProgramaGrafico(response.data);
        setLoadingTasaGraduacionProgramaGrafico(false);
      })
      .catch(() => {
        setErrorTasaGraduacionProgramaGrafico('Error al obtener la tasa de graduación (programa)');
        setLoadingTasaGraduacionProgramaGrafico(false);
      });
  };

  const fetchTasaGraduacionNivelGrafico = (jwt, periodo, facultad, programa) => {
    setLoadingTasaGraduacionNivelGrafico(true);
    setErrorTasaGraduacionNivelGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-graduacion/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaGraduacionNivelGrafico(response.data);
        setLoadingTasaGraduacionNivelGrafico(false);
      })
      .catch(() => {
        setErrorTasaGraduacionNivelGrafico('Error al obtener la tasa de graduación (nivel)');
        setLoadingTasaGraduacionNivelGrafico(false);
      });
  };

  const fetchTasaAusenciaPeriodoGrafico = (jwt, facultad, programa, nivel) => {
    setLoadingTasaAusenciaPeriodoGrafico(true);
    setErrorTasaAusenciaPeriodoGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-ausencia-intersemestral/estadistica-periodo');
    const params = [];
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaAusenciaPeriodoGrafico(response.data);
        setLoadingTasaAusenciaPeriodoGrafico(false);
      })
      .catch(() => {
        setErrorTasaAusenciaPeriodoGrafico('Error al obtener la tasa de ausencia (periodo)');
        setLoadingTasaAusenciaPeriodoGrafico(false);
      });
  };

  const fetchTasaAusenciaFacultadGrafico = (jwt, periodo, programa, nivel) => {
    setLoadingTasaAusenciaFacultadGrafico(true);
    setErrorTasaAusenciaFacultadGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-ausencia-intersemestral/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaAusenciaFacultadGrafico(response.data);
        setLoadingTasaAusenciaFacultadGrafico(false);
      })
      .catch(() => {
        setErrorTasaAusenciaFacultadGrafico('Error al obtener la tasa de ausencia (facultad)');
        setLoadingTasaAusenciaFacultadGrafico(false);
      });
  };

  const fetchTasaAusenciaProgramaGrafico = (jwt, periodo, facultad, nivel) => {
    setLoadingTasaAusenciaProgramaGrafico(true);
    setErrorTasaAusenciaProgramaGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-ausencia-intersemestral/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaAusenciaProgramaGrafico(response.data);
        setLoadingTasaAusenciaProgramaGrafico(false);
      })
      .catch(() => {
        setErrorTasaAusenciaProgramaGrafico('Error al obtener la tasa de ausencia (programa)');
        setLoadingTasaAusenciaProgramaGrafico(false);
      });
  };

  const fetchTasaAusenciaNivelGrafico = (jwt, periodo, facultad, programa) => {
    setLoadingTasaAusenciaNivelGrafico(true);
    setErrorTasaAusenciaNivelGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-ausencia-intersemestral/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaAusenciaNivelGrafico(response.data);
        setLoadingTasaAusenciaNivelGrafico(false);
      })
      .catch(() => {
        setErrorTasaAusenciaNivelGrafico('Error al obtener la tasa de ausencia (nivel)');
        setLoadingTasaAusenciaNivelGrafico(false);
      });
  };

  const fetchTasaSupervivenciaPeriodoGrafico = (jwt, facultad, programa, nivel) => {
    setLoadingTasaSupervivenciaPeriodoGrafico(true);
    setErrorTasaSupervivenciaPeriodoGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-supervivencia/estadistica-periodo');
    const params = [];
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaSupervivenciaPeriodoGrafico(response.data);
        setLoadingTasaSupervivenciaPeriodoGrafico(false);
      })
      .catch(() => {
        setErrorTasaSupervivenciaPeriodoGrafico('Error al obtener la tasa de supervivencia (periodo)');
        setLoadingTasaSupervivenciaPeriodoGrafico(false);
      });
  };

  const fetchTasaSupervivenciaFacultadGrafico = (jwt, periodo, programa, nivel) => {
    setLoadingTasaSupervivenciaFacultadGrafico(true);
    setErrorTasaSupervivenciaFacultadGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-supervivencia/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaSupervivenciaFacultadGrafico(response.data);
        setLoadingTasaSupervivenciaFacultadGrafico(false);
      })
      .catch(() => {
        setErrorTasaSupervivenciaFacultadGrafico('Error al obtener la tasa de supervivencia (facultad)');
        setLoadingTasaSupervivenciaFacultadGrafico(false);
      });
  };

  const fetchTasaSupervivenciaProgramaGrafico = (jwt, periodo, facultad, nivel) => {
    setLoadingTasaSupervivenciaProgramaGrafico(true);
    setErrorTasaSupervivenciaProgramaGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-supervivencia/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaSupervivenciaProgramaGrafico(response.data);
        setLoadingTasaSupervivenciaProgramaGrafico(false);
      })
      .catch(() => {
        setErrorTasaSupervivenciaProgramaGrafico('Error al obtener la tasa de supervivencia (programa)');
        setLoadingTasaSupervivenciaProgramaGrafico(false);
      });
  };

  const fetchTasaSupervivenciaNivelGrafico = (jwt, periodo, facultad, programa) => {
    setLoadingTasaSupervivenciaNivelGrafico(true);
    setErrorTasaSupervivenciaNivelGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-supervivencia/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaSupervivenciaNivelGrafico(response.data);
        setLoadingTasaSupervivenciaNivelGrafico(false);
      })
      .catch(() => {
        setErrorTasaSupervivenciaNivelGrafico('Error al obtener la tasa de supervivencia (nivel)');
        setLoadingTasaSupervivenciaNivelGrafico(false);
      });
  };

  const fetchTasaDesercion28PeriodoGrafico = (jwt, facultad, programa, nivel) => {
    setLoadingTasaDesercion28PeriodoGrafico(true);
    setErrorTasaDesercion28PeriodoGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-periodo-2-8/estadistica-periodo');
    const params = [];
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercion28PeriodoGrafico(response.data);
        setLoadingTasaDesercion28PeriodoGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercion28PeriodoGrafico('Error al obtener la tasa de deserción 2.8 (periodo)');
        setLoadingTasaDesercion28PeriodoGrafico(false);
      });
  };

  const fetchTasaDesercion28FacultadGrafico = (jwt, periodo, programa, nivel) => {
    setLoadingTasaDesercion28FacultadGrafico(true);
    setErrorTasaDesercion28FacultadGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-periodo-2-8/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercion28FacultadGrafico(response.data);
        setLoadingTasaDesercion28FacultadGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercion28FacultadGrafico('Error al obtener la tasa de deserción 2.8 (facultad)');
        setLoadingTasaDesercion28FacultadGrafico(false);
      });
  };

  const fetchTasaDesercion28ProgramaGrafico = (jwt, periodo, facultad, nivel) => {
    setLoadingTasaDesercion28ProgramaGrafico(true);
    setErrorTasaDesercion28ProgramaGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-periodo-2-8/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercion28ProgramaGrafico(response.data);
        setLoadingTasaDesercion28ProgramaGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercion28ProgramaGrafico('Error al obtener la tasa de deserción 2.8 (programa)');
        setLoadingTasaDesercion28ProgramaGrafico(false);
      });
  };

  const fetchTasaDesercion28NivelGrafico = (jwt, periodo, facultad, programa) => {
    setLoadingTasaDesercion28NivelGrafico(true);
    setErrorTasaDesercion28NivelGrafico(null);
    let url = buildApiUrl('/apiDesercion/desercion/tasa-desercion-periodo-2-8/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setTasaDesercion28NivelGrafico(response.data);
        setLoadingTasaDesercion28NivelGrafico(false);
      })
      .catch(() => {
        setErrorTasaDesercion28NivelGrafico('Error al obtener la tasa de deserción 2.8 (nivel)');
        setLoadingTasaDesercion28NivelGrafico(false);
      });
  };

  const fetchEstadisticaPrimiparosPeriodo = (jwt, periodo, facultad, programa, nivel) => {
    setLoadingPrimiparosPeriodo(true);
    setErrorPrimiparosPeriodo(null);
    let url = buildApiUrl('/apiDesercion/matriculas/primiparos/estadistica');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaPrimiparosPeriodo(response.data);
        setLoadingPrimiparosPeriodo(false);
      })
      .catch(() => {
        setErrorPrimiparosPeriodo('Error al obtener la estadística de primíparos por período');
        setLoadingPrimiparosPeriodo(false);
      });
  };

  const fetchEstadisticaPrimiparosFacultad = (jwt, periodo, programa, nivel) => {
    setLoadingPrimiparosFacultad(true);
    setErrorPrimiparosFacultad(null);
    let url = buildApiUrl('/apiDesercion/matriculas/primiparos/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaPrimiparosFacultad(response.data);
        setLoadingPrimiparosFacultad(false);
      })
      .catch(() => {
        setErrorPrimiparosFacultad('Error al obtener la estadística de primíparos por facultad');
        setLoadingPrimiparosFacultad(false);
      });
  };

  const fetchEstadisticaPrimiparosPrograma = (jwt, periodo, facultad, nivel) => {
    setLoadingPrimiparosPrograma(true);
    setErrorPrimiparosPrograma(null);
    let url = buildApiUrl('/apiDesercion/matriculas/primiparos/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaPrimiparosPrograma(response.data);
        setLoadingPrimiparosPrograma(false);
      })
      .catch(() => {
        setErrorPrimiparosPrograma('Error al obtener la estadística de primíparos por programa');
        setLoadingPrimiparosPrograma(false);
      });
  };

  const fetchEstadisticaPrimiparosNivel = (jwt, periodo, facultad, programa) => {
    setLoadingPrimiparosNivel(true);
    setErrorPrimiparosNivel(null);
    let url = buildApiUrl('/apiDesercion/matriculas/primiparos/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaPrimiparosNivel(response.data);
        setLoadingPrimiparosNivel(false);
      })
      .catch(() => {
        setErrorPrimiparosNivel('Error al obtener la estadística de primíparos por nivel');
        setLoadingPrimiparosNivel(false);
      });
  };

  const fetchEstadisticaGraduadosPeriodo = (jwt, periodo, facultad, programa, nivel) => {
    setLoadingGraduadosPeriodo(true);
    setErrorGraduadosPeriodo(null);
    let url = buildApiUrl('/apiDesercion/matriculas/graduados/estadistica');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaGraduadosPeriodo(response.data);
        setLoadingGraduadosPeriodo(false);
      })
      .catch(() => {
        setErrorGraduadosPeriodo('Error al obtener la estadística de graduados por período');
        setLoadingGraduadosPeriodo(false);
      });
  };

  const fetchEstadisticaGraduadosFacultad = (jwt, periodo, programa, nivel) => {
    setLoadingGraduadosFacultad(true);
    setErrorGraduadosFacultad(null);
    let url = buildApiUrl('/apiDesercion/matriculas/graduados/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaGraduadosFacultad(response.data);
        setLoadingGraduadosFacultad(false);
      })
      .catch(() => {
        setErrorGraduadosFacultad('Error al obtener la estadística de graduados por facultad');
        setLoadingGraduadosFacultad(false);
      });
  };

  const fetchEstadisticaGraduadosPrograma = (jwt, periodo, facultad, nivel) => {
    setLoadingGraduadosPrograma(true);
    setErrorGraduadosPrograma(null);
    let url = buildApiUrl('/apiDesercion/matriculas/graduados/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaGraduadosPrograma(response.data);
        setLoadingGraduadosPrograma(false);
      })
      .catch(() => {
        setErrorGraduadosPrograma('Error al obtener la estadística de graduados por programa');
        setLoadingGraduadosPrograma(false);
      });
  };

  const fetchEstadisticaGraduadosNivel = (jwt, periodo, facultad, programa) => {
    setLoadingGraduadosNivel(true);
    setErrorGraduadosNivel(null);
    let url = buildApiUrl('/apiDesercion/matriculas/graduados/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaGraduadosNivel(response.data);
        setLoadingGraduadosNivel(false);
      })
      .catch(() => {
        setErrorGraduadosNivel('Error al obtener la estadística de graduados por nivel');
        setLoadingGraduadosNivel(false);
      });
  };

  const fetchEstadisticaAusenciaPeriodo = (jwt, periodo, facultad, programa, nivel) => {
    setLoadingAusenciaPeriodo(true);
    setErrorAusenciaPeriodo(null);
    let url = buildApiUrl('/apiDesercion/desercion/ausencia-intersemestral/estadistica');
    const params = [];
    // Para el gráfico de período, siempre mostrar todos los períodos hasta el último disponible
    // No pasar periodo para que use el máximo automáticamente
    params.push('sinPeriodo=true');
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaAusenciaPeriodo(response.data);
        setLoadingAusenciaPeriodo(false);
      })
      .catch(() => {
        setErrorAusenciaPeriodo('Error al obtener la estadística de ausencia intersemestral por período');
        setLoadingAusenciaPeriodo(false);
      });
  };

  const fetchEstadisticaAusenciaFacultad = (jwt, periodo, programa, nivel) => {
    setLoadingAusenciaFacultad(true);
    setErrorAusenciaFacultad(null);
    let url = buildApiUrl('/apiDesercion/desercion/ausencia-intersemestral/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaAusenciaFacultad(response.data);
        setLoadingAusenciaFacultad(false);
      })
      .catch(() => {
        setErrorAusenciaFacultad('Error al obtener la estadística de ausencia intersemestral por facultad');
        setLoadingAusenciaFacultad(false);
      });
  };

  const fetchEstadisticaAusenciaPrograma = (jwt, periodo, facultad, nivel) => {
    setLoadingAusenciaPrograma(true);
    setErrorAusenciaPrograma(null);
    let url = buildApiUrl('/apiDesercion/desercion/ausencia-intersemestral/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaAusenciaPrograma(response.data);
        setLoadingAusenciaPrograma(false);
      })
      .catch(() => {
        setErrorAusenciaPrograma('Error al obtener la estadística de ausencia intersemestral por programa');
        setLoadingAusenciaPrograma(false);
      });
  };

  const fetchEstadisticaAusenciaNivel = (jwt, periodo, facultad, programa) => {
    setLoadingAusenciaNivel(true);
    setErrorAusenciaNivel(null);
    let url = buildApiUrl('/apiDesercion/desercion/ausencia-intersemestral/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaAusenciaNivel(response.data);
        setLoadingAusenciaNivel(false);
      })
      .catch(() => {
        setErrorAusenciaNivel('Error al obtener la estadística de ausencia intersemestral por nivel');
        setLoadingAusenciaNivel(false);
      });
  };

  const fetchEstadisticaDesercionPeriodo = (jwt, periodo, facultad, programa, nivel) => {
    setLoadingDesercionPeriodo(true);
    setErrorDesercionPeriodo(null);
    let url = buildApiUrl('/apiDesercion/desercion/estadistica');
    const params = [];
    // Para el gráfico de período, siempre mostrar todos los períodos hasta el último disponible
    // No pasar periodo para que use el máximo automáticamente
    params.push('sinPeriodo=true');
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaDesercionPeriodo(response.data);
        setLoadingDesercionPeriodo(false);
      })
      .catch(() => {
        setErrorDesercionPeriodo('Error al obtener la estadística de deserción por período');
        setLoadingDesercionPeriodo(false);
      });
  };

  const fetchEstadisticaDesercionFacultad = (jwt, periodo, programa, nivel) => {
    setLoadingDesercionFacultad(true);
    setErrorDesercionFacultad(null);
    let url = buildApiUrl('/apiDesercion/desercion/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaDesercionFacultad(response.data);
        setLoadingDesercionFacultad(false);
      })
      .catch(() => {
        setErrorDesercionFacultad('Error al obtener la estadística de deserción por facultad');
        setLoadingDesercionFacultad(false);
      });
  };

  const fetchEstadisticaDesercionPrograma = (jwt, periodo, facultad, nivel) => {
    setLoadingDesercionPrograma(true);
    setErrorDesercionPrograma(null);
    let url = buildApiUrl('/apiDesercion/desercion/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaDesercionPrograma(response.data);
        setLoadingDesercionPrograma(false);
      })
      .catch(() => {
        setErrorDesercionPrograma('Error al obtener la estadística de deserción por programa');
        setLoadingDesercionPrograma(false);
      });
  };

  const fetchEstadisticaDesercionNivel = (jwt, periodo, facultad, programa) => {
    setLoadingDesercionNivel(true);
    setErrorDesercionNivel(null);
    let url = buildApiUrl('/apiDesercion/desercion/estadistica-nivel');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (!periodo) params.push('sinPeriodo=true');
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaDesercionNivel(response.data);
        setLoadingDesercionNivel(false);
      })
      .catch(() => {
        setErrorDesercionNivel('Error al obtener la estadística de deserción por nivel');
        setLoadingDesercionNivel(false);
      });
  };

  const fetchAusenciaIntersemestral = (jwt, periodo, programa, facultad) => {
    setLoadingAusenciaIntersemestral(true);
    setErrorAusenciaIntersemestral(null);
    let url = buildApiUrl('/apiDesercion/desercion/ausencia-intersemestral');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    console.log('[Frontend] Llamando a:', url);
    axios.get(url, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        console.log('[Frontend] Respuesta recibida:', response.data.length, 'registros');
        setAusenciaIntersemestral(response.data);
        setLoadingAusenciaIntersemestral(false);
      })
      .catch(error => {
        console.error('[Frontend] Error en fetchAusenciaIntersemestral:', error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorAusenciaIntersemestral('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorAusenciaIntersemestral('Error al obtener los datos de ausencia intersemestral');
        }
        setLoadingAusenciaIntersemestral(false);
      });
  };

  const fetchPrimiparos = (jwt, periodo, programa, facultad) => {
    setLoadingPrimiparos(true);
    setErrorPrimiparos(null);
    let url = buildApiUrl('/apiDesercion/matriculas/primiparos');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setPrimiparos(response.data);
        setLoadingPrimiparos(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorPrimiparos('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorPrimiparos('Error al obtener los datos de primíparos');
        }
        setLoadingPrimiparos(false);
      });
  };

  const fetchGraduados = (jwt, periodo, programa, facultad) => {
    setLoadingGraduados(true);
    setErrorGraduados(null);
    let url = buildApiUrl('/apiDesercion/matriculas/graduados');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setGraduados(response.data);
        setLoadingGraduados(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setIsAuthenticated(false);
          setToken('');
          localStorage.removeItem('token');
          setErrorGraduados('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else {
          setErrorGraduados('Error al obtener los datos de graduados');
        }
        setLoadingGraduados(false);
      });
  };

  // 3. Modificar los fetchers para aceptar los filtros
  const fetchEstadistica = (jwt, periodo, facultad, nivel, programa) => {
    setLoadingEstadistica(true);
    setErrorEstadistica(null);
    let url = buildApiUrl('/apiDesercion/matriculas/estadistica');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadistica(response.data);
        setLoadingEstadistica(false);
      })
      .catch(error => {
        setErrorEstadistica('Error al obtener la estadística');
        setLoadingEstadistica(false);
      });
  };
  const fetchEstadisticaFacultad = (jwt, periodo, nivel, programa) => {
    setLoadingFacultad(true);
    setErrorFacultad(null);
    let url = buildApiUrl('/apiDesercion/matriculas/estadistica-facultad');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaFacultad(response.data);
        setLoadingFacultad(false);
      })
      .catch(error => {
        setErrorFacultad('Error al obtener la estadística por facultad');
        setLoadingFacultad(false);
      });
  };
  const fetchEstadisticaPrograma = (jwt, periodo, facultad, nivel) => {
    setLoadingPrograma(true);
    setErrorPrograma(null);
    let url = buildApiUrl('/apiDesercion/matriculas/estadistica-programa');
    const params = [];
    if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
    if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
    if (nivel) params.push(`nivel=${encodeURIComponent(nivel)}`);
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaPrograma(response.data);
        setLoadingPrograma(false);
      })
      .catch(error => {
        setErrorPrograma('Error al obtener la estadística por programa');
        setLoadingPrograma(false);
      });
  };
  // Modificar fetchEstadisticaNivel para usar el endpoint total si no hay periodo ni facultad seleccionados
  const fetchEstadisticaNivel = (jwt, periodo, facultad, programa) => {
    setLoadingNivel(true);
    setErrorNivel(null);
    let url = '';
    if (!periodo && !facultad && !programa) {
      url = `${buildApiUrl('/apiDesercion/matriculas/estadistica-nivel-total')}?conCancelados=${conCancelados}`;
    } else {
      url = buildApiUrl('/apiDesercion/matriculas/estadistica-nivel');
      const params = [];
      if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
      if (facultad) params.push(`facultad=${encodeURIComponent(facultad)}`);
      if (programa) params.push(`programa=${encodeURIComponent(programa)}`);
      params.push(`conCancelados=${conCancelados}`);
      if (params.length > 0) url += `?${params.join('&')}`;
    }
    axios.get(url, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(response => {
        setEstadisticaNivel(response.data);
        setLoadingNivel(false);
      })
      .catch(error => {
        setErrorNivel('Error al obtener la estadística por nivel');
        setLoadingNivel(false);
      });
  };

  const fetchEstadisticaFacultadTotal = (jwt) => {
    setLoadingFacultadTotal(true);
    setErrorFacultadTotal(null);
    axios.get(`${buildApiUrl('/apiDesercion/matriculas/estadistica-facultad-total')}?conCancelados=${conCancelados}`, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setEstadisticaFacultadTotal(response.data);
        setLoadingFacultadTotal(false);
      })
      .catch(error => {
        setErrorFacultadTotal('Error al obtener la estadística total por facultad');
        setLoadingFacultadTotal(false);
      });
  };
  const fetchEstadisticaProgramaTotal = (jwt) => {
    setLoadingProgramaTotal(true);
    setErrorProgramaTotal(null);
    axios.get(`${buildApiUrl('/apiDesercion/matriculas/estadistica-programa-total')}?conCancelados=${conCancelados}`, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setEstadisticaProgramaTotal(response.data);
        setLoadingProgramaTotal(false);
      })
      .catch(error => {
        setErrorProgramaTotal('Error al obtener la estadística total por programa');
        setLoadingProgramaTotal(false);
      });
  };

  // 2. Fetchers para nivel
  const fetchEstadisticaNivelTotal = (jwt) => {
    setLoadingNivelTotal(true);
    setErrorNivelTotal(null);
    axios.get(`${buildApiUrl('/apiDesercion/matriculas/estadistica-nivel-total')}?conCancelados=${conCancelados}`, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setEstadisticaNivelTotal(response.data);
        setLoadingNivelTotal(false);
      })
      .catch(error => {
        setErrorNivelTotal('Error al obtener la estadística total por nivel');
        setLoadingNivelTotal(false);
      });
  };

  const fetchPeriodosTasaDesercion = (jwt) => {
    setLoadingTasaDesercion(true);
    setErrorTasaDesercion(null);
    axios.get(buildApiUrl('/apiDesercion/matriculas/periodos'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setPeriodosTasaDesercion(response.data);
        if (response.data.length > 0 && !periodoSeleccionadoTasa) {
          setPeriodoSeleccionadoTasa(response.data[0]);
        }
        setLoadingTasaDesercion(false);
      })
      .catch(error => {
        setErrorTasaDesercion('Error al obtener los períodos');
        setLoadingTasaDesercion(false);
      });
  };

  const fetchProgramasTasaDesercion = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/programas'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setProgramasTasaDesercion(response.data);
      })
      .catch(error => {
        console.error('Error al obtener los programas para tasa de deserción:', error);
      });
  };

  const fetchPeriodosTasaAusencia = (jwt) => {
    setLoadingTasaAusencia(true);
    setErrorTasaAusencia(null);
    axios.get(buildApiUrl('/apiDesercion/matriculas/periodos'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setPeriodosTasaAusencia(response.data);
        if (response.data.length > 0 && !periodoSeleccionadoTasaAusencia) {
          setPeriodoSeleccionadoTasaAusencia(response.data[0]);
        }
        setLoadingTasaAusencia(false);
      })
      .catch(error => {
        setErrorTasaAusencia('Error al obtener los períodos');
        setLoadingTasaAusencia(false);
      });
  };

  const fetchProgramasTasaAusencia = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/programas'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setProgramasTasaAusencia(response.data);
      })
      .catch(error => {
        console.error('Error al obtener los programas para tasa de ausencia intersemestral:', error);
      });
  };

  const fetchPeriodosTasaDesercionCohorte = (jwt) => {
    setLoadingTasaDesercionCohorte(true);
    setErrorTasaDesercionCohorte(null);
    axios.get(buildApiUrl('/apiDesercion/matriculas/periodos'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        // La API devuelve periodos en orden DESC (más recientes primero)
        const todos = Array.isArray(response.data) ? response.data : [];
        setPeriodosCohorteTodos(todos);
        // Excluir los 2 períodos más recientes para cohorte
        const periodosFiltrados = todos.slice(2);
        setPeriodosTasaDesercionCohorte(periodosFiltrados);
        // Predeterminar Semestre al último (más reciente)
        if (todos.length > 0 && !periodoSeleccionadoCohorte) {
          setPeriodoSeleccionadoCohorte(todos[0]);
        }
        setLoadingTasaDesercionCohorte(false);
      })
      .catch(error => {
        setErrorTasaDesercionCohorte('Error al obtener los períodos');
        setLoadingTasaDesercionCohorte(false);
      });
  };

  const fetchProgramasTasaDesercionCohorte = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/programas'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setProgramasTasaDesercionCohorte(response.data);
      })
      .catch(error => {
        console.error('Error al obtener los programas para tasa de deserción por cohorte:', error);
      });
  };

  const fetchPeriodosTasaDesercionPromedio = (jwt) => {
    setLoadingTasaDesercionPromedio(true);
    setErrorTasaDesercionPromedio(null);
    axios.get(buildApiUrl('/apiDesercion/matriculas/periodos'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setPeriodosTasaDesercionPromedio(response.data);
        if (response.data.length > 0 && !periodoSeleccionadoTasaPromedio) {
          setPeriodoSeleccionadoTasaPromedio(response.data[0]);
        }
        setLoadingTasaDesercionPromedio(false);
      })
      .catch(error => {
        setErrorTasaDesercionPromedio('Error al obtener los períodos');
        setLoadingTasaDesercionPromedio(false);
      });
  };

  const fetchProgramasTasaDesercionPromedio = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/programas'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setProgramasTasaDesercionPromedio(response.data);
      })
      .catch(error => {
        console.error('Error al obtener los programas para tasa de deserción promedio:', error);
      });
  };

  const fetchPeriodosTasaGraduacion = (jwt) => {
    setLoadingTasaGraduacion(true);
    setErrorTasaGraduacion(null);
    axios.get(buildApiUrl('/apiDesercion/matriculas/periodos'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setPeriodosTasaGraduacion(response.data);
        if (response.data.length > 0 && !periodoSeleccionadoTasaGraduacion) {
          setPeriodoSeleccionadoTasaGraduacion(response.data[0]);
        }
        setLoadingTasaGraduacion(false);
      })
      .catch(error => {
        setErrorTasaGraduacion('Error al obtener los períodos');
        setLoadingTasaGraduacion(false);
      });
  };

  const fetchProgramasTasaGraduacion = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/programas'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setProgramasTasaGraduacion(response.data);
      })
      .catch(error => {
        console.error('Error al obtener los programas para tasa de graduación:', error);
      });
  };

  const fetchPeriodosTasaSupervivencia = (jwt) => {
    setLoadingTasaSupervivencia(true);
    setErrorTasaSupervivencia(null);
    axios.get(buildApiUrl('/apiDesercion/matriculas/periodos'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setPeriodosTasaSupervivencia(response.data);
        if (response.data.length > 0 && !periodoSeleccionadoTasaSupervivencia) {
          setPeriodoSeleccionadoTasaSupervivencia(response.data[0]);
        }
        setLoadingTasaSupervivencia(false);
      })
      .catch(error => {
        setErrorTasaSupervivencia('Error al obtener los períodos');
        setLoadingTasaSupervivencia(false);
      });
  };

  const fetchProgramasTasaSupervivencia = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/programas'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setProgramasTasaSupervivencia(response.data);
      })
      .catch(error => {
        console.error('Error al obtener los programas para tasa de supervivencia:', error);
      });
  };

  const fetchPeriodosTasaDesercion28 = (jwt) => {
    setLoadingTasaDesercion28(true);
    setErrorTasaDesercion28(null);
    axios.get(buildApiUrl('/apiDesercion/matriculas/periodos'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setPeriodosTasaDesercion28(response.data);
        if (response.data.length > 0 && !periodoSeleccionadoTasa28) {
          setPeriodoSeleccionadoTasa28(response.data[0]);
        }
        setLoadingTasaDesercion28(false);
      })
      .catch(error => {
        setErrorTasaDesercion28('Error al obtener los períodos');
        setLoadingTasaDesercion28(false);
      });
  };

  const fetchProgramasTasaDesercion28 = (jwt) => {
    axios.get(buildApiUrl('/apiDesercion/matriculas/programas'), {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(response => {
        setProgramasTasaDesercion28(response.data);
      })
      .catch(error => {
        console.error('Error al obtener los programas para tasa de deserción periodo 2.8:', error);
      });
  };

  const handlePeriodoChange = (e) => {
    setPeriodoSeleccionado(e.target.value);
    // El useEffect se encargará de recargar las matrículas cuando cambie periodoSeleccionado
  };

  const handlePeriodoTasaChange = (e) => {
    setPeriodoSeleccionadoTasa(e.target.value);
    if (e.target.value) {
      const programaActual = programaSeleccionadoTasa || '';
      calcularTasaDesercion(token, e.target.value, programaActual);
    }
  };

  const handleProgramaTasaChange = (e) => {
    setProgramaSeleccionadoTasa(e.target.value);
    if (e.target.value && periodoSeleccionadoTasa) {
      calcularTasaDesercion(token, periodoSeleccionadoTasa, e.target.value);
    } else if (e.target.value && !periodoSeleccionadoTasa) {
      // Si hay período preseleccionado pero no se ha actualizado el estado, usar el primero
      const periodoActual = periodosTasaDesercion.length > 0 ? periodosTasaDesercion[0] : '';
      if (periodoActual) {
        calcularTasaDesercion(token, periodoActual, e.target.value);
      }
    } else if (!e.target.value && periodoSeleccionadoTasa) {
      // Si se deselecciona el programa, calcular para todos los programas
      calcularTasaDesercion(token, periodoSeleccionadoTasa, '');
    } else if (!e.target.value && !periodoSeleccionadoTasa) {
      // Si no hay programa seleccionado y hay período preseleccionado, calcular para todos
      const periodoActual = periodosTasaDesercion.length > 0 ? periodosTasaDesercion[0] : '';
      if (periodoActual) {
        calcularTasaDesercion(token, periodoActual, '');
      }
    }
  };

  const handlePeriodoTasa28Change = (e) => {
    setPeriodoSeleccionadoTasa28(e.target.value);
    if (e.target.value) {
      const programaActual = programaSeleccionadoTasa28 || '';
      calcularTasaDesercion28(token, e.target.value, programaActual);
    }
  };

  const handleProgramaTasa28Change = (e) => {
    setProgramaSeleccionadoTasa28(e.target.value);
    if (e.target.value && periodoSeleccionadoTasa28) {
      calcularTasaDesercion28(token, periodoSeleccionadoTasa28, e.target.value);
    } else if (e.target.value && !periodoSeleccionadoTasa28) {
      const periodoActual = periodosTasaDesercion28.length > 0 ? periodosTasaDesercion28[0] : '';
      if (periodoActual) {
        calcularTasaDesercion28(token, periodoActual, e.target.value);
      }
    } else if (!e.target.value && periodoSeleccionadoTasa28) {
      calcularTasaDesercion28(token, periodoSeleccionadoTasa28, '');
    } else if (!e.target.value && !periodoSeleccionadoTasa28) {
      const periodoActual = periodosTasaDesercion28.length > 0 ? periodosTasaDesercion28[0] : '';
      if (periodoActual) {
        calcularTasaDesercion28(token, periodoActual, '');
      }
    }
  };

  const handlePeriodoTasaPromedioChange = (e) => {
    setPeriodoSeleccionadoTasaPromedio(e.target.value);
    if (e.target.value) {
      const programaActual = programaSeleccionadoTasaPromedio || '';
      calcularTasaDesercionPromedio(token, e.target.value, programaActual);
    }
  };

  const handleProgramaTasaPromedioChange = (e) => {
    setProgramaSeleccionadoTasaPromedio(e.target.value);
    if (e.target.value && periodoSeleccionadoTasaPromedio) {
      calcularTasaDesercionPromedio(token, periodoSeleccionadoTasaPromedio, e.target.value);
    } else if (e.target.value && !periodoSeleccionadoTasaPromedio) {
      // Si hay período preseleccionado pero no se ha actualizado el estado, usar el primero
      const periodoActual = periodosTasaDesercionPromedio.length > 0 ? periodosTasaDesercionPromedio[0] : '';
      if (periodoActual) {
        calcularTasaDesercionPromedio(token, periodoActual, e.target.value);
      }
    } else if (!e.target.value && periodoSeleccionadoTasaPromedio) {
      // Si se deselecciona el programa, calcular para todos los programas
      calcularTasaDesercionPromedio(token, periodoSeleccionadoTasaPromedio, '');
    } else if (!e.target.value && !periodoSeleccionadoTasaPromedio) {
      // Si no hay programa seleccionado y hay período preseleccionado, calcular para todos
      const periodoActual = periodosTasaDesercionPromedio.length > 0 ? periodosTasaDesercionPromedio[0] : '';
      if (periodoActual) {
        calcularTasaDesercionPromedio(token, periodoActual, '');
      }
    }
  };

  const handlePeriodoTasaGraduacionChange = (e) => {
    setPeriodoSeleccionadoTasaGraduacion(e.target.value);
    if (e.target.value) {
      const programaActual = programaSeleccionadoTasaGraduacion || '';
      calcularTasaGraduacion(token, e.target.value, programaActual);
    }
  };

  const handleProgramaTasaGraduacionChange = (e) => {
    setProgramaSeleccionadoTasaGraduacion(e.target.value);
    if (e.target.value && periodoSeleccionadoTasaGraduacion) {
      calcularTasaGraduacion(token, periodoSeleccionadoTasaGraduacion, e.target.value);
    } else if (e.target.value && !periodoSeleccionadoTasaGraduacion) {
      // Si hay período preseleccionado pero no se ha actualizado el estado, usar el primero
      const periodoActual = periodosTasaGraduacion.length > 0 ? periodosTasaGraduacion[0] : '';
      if (periodoActual) {
        calcularTasaGraduacion(token, periodoActual, e.target.value);
      }
    } else if (!e.target.value && periodoSeleccionadoTasaGraduacion) {
      // Si se deselecciona el programa, calcular para todos los programas
      calcularTasaGraduacion(token, periodoSeleccionadoTasaGraduacion, '');
    } else if (!e.target.value && !periodoSeleccionadoTasaGraduacion) {
      // Si no hay programa seleccionado y hay período preseleccionado, calcular para todos
      const periodoActual = periodosTasaGraduacion.length > 0 ? periodosTasaGraduacion[0] : '';
      if (periodoActual) {
        calcularTasaGraduacion(token, periodoActual, '');
      }
    }
  };

  const handlePeriodoTasaSupervivenciaChange = (e) => {
    setPeriodoSeleccionadoTasaSupervivencia(e.target.value);
    if (e.target.value) {
      const programaActual = programaSeleccionadoTasaSupervivencia || '';
      calcularTasaSupervivencia(token, e.target.value, programaActual);
    }
  };

  const handleProgramaTasaSupervivenciaChange = (e) => {
    setProgramaSeleccionadoTasaSupervivencia(e.target.value);
    if (e.target.value && periodoSeleccionadoTasaSupervivencia) {
      calcularTasaSupervivencia(token, periodoSeleccionadoTasaSupervivencia, e.target.value);
    } else if (e.target.value && !periodoSeleccionadoTasaSupervivencia) {
      const periodoActual = periodosTasaSupervivencia.length > 0 ? periodosTasaSupervivencia[0] : '';
      if (periodoActual) {
        calcularTasaSupervivencia(token, periodoActual, e.target.value);
      }
    } else if (!e.target.value && periodoSeleccionadoTasaSupervivencia) {
      calcularTasaSupervivencia(token, periodoSeleccionadoTasaSupervivencia, '');
    } else if (!e.target.value && !periodoSeleccionadoTasaSupervivencia) {
      const periodoActual = periodosTasaSupervivencia.length > 0 ? periodosTasaSupervivencia[0] : '';
      if (periodoActual) {
        calcularTasaSupervivencia(token, periodoActual, '');
      }
    }
  };

  const handleCohorteChange = (e) => {
    const nuevaCohorte = e.target.value;
    console.log('Cambiando cohorte a:', nuevaCohorte);
    setCohorteSeleccionada(nuevaCohorte);
    if (nuevaCohorte) {
      console.log('Ejecutando calcularTasaDesercionCohorte con cohorte:', nuevaCohorte, 'programa:', programaSeleccionadoCohorte || '');
      calcularTasaDesercionCohorte(token, nuevaCohorte, programaSeleccionadoCohorte || '');
    }
  };

  const handlePeriodoTasaAusenciaChange = (e) => {
    setPeriodoSeleccionadoTasaAusencia(e.target.value);
    if (e.target.value) {
      const programaActual = programaSeleccionadoTasaAusencia || '';
      calcularTasaAusenciaIntersemestral(token, e.target.value, programaActual);
    }
  };

  const handleProgramaTasaAusenciaChange = (e) => {
    setProgramaSeleccionadoTasaAusencia(e.target.value);
    if (e.target.value && periodoSeleccionadoTasaAusencia) {
      calcularTasaAusenciaIntersemestral(token, periodoSeleccionadoTasaAusencia, e.target.value);
    } else if (e.target.value && !periodoSeleccionadoTasaAusencia) {
      const periodoActual = periodosTasaAusencia.length > 0 ? periodosTasaAusencia[0] : '';
      if (periodoActual) {
        calcularTasaAusenciaIntersemestral(token, periodoActual, e.target.value);
      }
    } else if (!e.target.value && periodoSeleccionadoTasaAusencia) {
      calcularTasaAusenciaIntersemestral(token, periodoSeleccionadoTasaAusencia, '');
    } else if (!e.target.value && !periodoSeleccionadoTasaAusencia) {
      const periodoActual = periodosTasaAusencia.length > 0 ? periodosTasaAusencia[0] : '';
      if (periodoActual) {
        calcularTasaAusenciaIntersemestral(token, periodoActual, '');
      }
    }
  };

  const handlePeriodoCohorteChange = (e) => {
    const nuevoSemestre = e.target.value;
    setPeriodoSeleccionadoCohorte(nuevoSemestre);
    if (nuevoSemestre && cohorteSeleccionada) {
      // Pasar el nuevo semestre directamente como parámetro
      calcularTasaDesercionCohorte(token, cohorteSeleccionada, programaSeleccionadoCohorte || '', nuevoSemestre);
    }
  };

  const handleProgramaCohorteChange = (e) => {
    setProgramaSeleccionadoCohorte(e.target.value);
    if (e.target.value && cohorteSeleccionada) {
      calcularTasaDesercionCohorte(token, cohorteSeleccionada, e.target.value);
    } else if (e.target.value && !cohorteSeleccionada) {
      // Si hay cohorte preseleccionada pero no se ha actualizado el estado, usar la primera
      const cohorteActual = periodosTasaDesercionCohorte.length > 0 ? periodosTasaDesercionCohorte[0] : '';
      if (cohorteActual) {
        calcularTasaDesercionCohorte(token, cohorteActual, e.target.value);
      }
    } else if (!e.target.value && cohorteSeleccionada) {
      // Si se deselecciona el programa, calcular para todos los programas
      calcularTasaDesercionCohorte(token, cohorteSeleccionada, '');
    } else if (!e.target.value && !cohorteSeleccionada) {
      // Si no hay programa seleccionado y hay cohorte preseleccionada, calcular para todos
      const cohorteActual = periodosTasaDesercionCohorte.length > 0 ? periodosTasaDesercionCohorte[0] : '';
      if (cohorteActual) {
        calcularTasaDesercionCohorte(token, cohorteActual, '');
      }
    }
  };

  const calcularTasaDesercion = (jwt, periodo, programa, facultad = '', nivel = '') => {
    setLoadingCalculoTasa(true);
    setErrorCalculoTasa(null);
    
    // Obtener datos reales de desertores
    let urlDesertores = buildApiUrl('/apiDesercion/desercion');
    const paramsDesertores = [];
    
    if (periodo) {
      paramsDesertores.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsDesertores.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsDesertores.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsDesertores.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsDesertores.push(`conCancelados=${conCancelados}`);
    
    if (paramsDesertores.length > 0) {
      urlDesertores += `?${paramsDesertores.join('&')}`;
    }
    
    // Obtener conteo real de matriculados
    let urlMatriculados = buildApiUrl('/apiDesercion/matriculas/conteo');
    const paramsMatriculados = [];
    
    if (periodo) {
      paramsMatriculados.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsMatriculados.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsMatriculados.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsMatriculados.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsMatriculados.push(`conCancelados=${conCancelados}`);
    
    if (paramsMatriculados.length > 0) {
      urlMatriculados += `?${paramsMatriculados.join('&')}`;
    }
    
    // Hacer ambas peticiones en paralelo
    Promise.all([
      axios.get(urlDesertores, { headers: { Authorization: `Bearer ${jwt}` } }),
      axios.get(urlMatriculados, { headers: { Authorization: `Bearer ${jwt}` } })
    ])
      .then(([desertoresResponse, matriculadosResponse]) => {
        const desertores = desertoresResponse.data.length;
        const matriculados = matriculadosResponse.data.cantidad;
        const periodoConsulta = matriculadosResponse.data.periodoConsulta;
        
        console.log('Desertores obtenidos:', desertores, 'URL:', urlDesertores);
        console.log('Matriculados obtenidos:', matriculados, 'URL:', urlMatriculados);
        console.log('Período consultado (t-2):', periodoConsulta);
        console.log('Datos de deserción:', desertoresResponse.data);
        
        const tasa = matriculados > 0 ? ((desertores / matriculados) * 100).toFixed(2) : 0;
        
        setDatosTasaDesercion({
          desertores,
          matriculados,
          tasa: parseFloat(tasa),
          periodo,
          periodoConsulta,
          programa: programa || 'Todos los programas'
        });
        setLoadingCalculoTasa(false);
      })
      .catch(error => {
        console.error('Error al calcular tasa de deserción:', error);
        setErrorCalculoTasa('Error al obtener datos de deserción');
        setLoadingCalculoTasa(false);
      });
  };

  const calcularTasaDesercion28 = (jwt, periodo, programa, facultad = '', nivel = '') => {
    setLoadingCalculoTasa28(true);
    setErrorCalculoTasa28(null);
    
    // Obtener datos reales de desertores
    let urlDesertores = buildApiUrl('/apiDesercion/desercion');
    const paramsDesertores = [];
    
    if (periodo) {
      paramsDesertores.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsDesertores.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsDesertores.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsDesertores.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsDesertores.push(`conCancelados=${conCancelados}`);
    
    if (paramsDesertores.length > 0) {
      urlDesertores += `?${paramsDesertores.join('&')}`;
    }
    
    // Obtener conteo de matriculados no graduados (t-2)
    let urlMatriculados = buildApiUrl('/apiDesercion/matriculas/conteo-no-graduados-t2');
    const paramsMatriculados = [];
    
    if (periodo) {
      paramsMatriculados.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsMatriculados.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsMatriculados.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsMatriculados.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsMatriculados.push(`conCancelados=${conCancelados}`);
    
    if (paramsMatriculados.length > 0) {
      urlMatriculados += `?${paramsMatriculados.join('&')}`;
    }
    
    // Hacer ambas peticiones en paralelo
    Promise.all([
      axios.get(urlDesertores, { headers: { Authorization: `Bearer ${jwt}` } }),
      axios.get(urlMatriculados, { headers: { Authorization: `Bearer ${jwt}` } })
    ])
      .then(([desertoresResponse, matriculadosResponse]) => {
        const desertores = desertoresResponse.data.length;
        const matriculados = matriculadosResponse.data.cantidad;
        const periodoConsulta = matriculadosResponse.data.periodoConsulta;
        
        console.log('[Tasa 2.8] Desertores obtenidos:', desertores, 'URL:', urlDesertores);
        console.log('[Tasa 2.8] Matriculados no graduados obtenidos:', matriculados, 'URL:', urlMatriculados);
        console.log('[Tasa 2.8] Período consultado (t-2):', periodoConsulta);
        
        const tasa = matriculados > 0 ? ((desertores / matriculados) * 100).toFixed(2) : 0;
        
        setDatosTasaDesercion28({
          desertores,
          matriculados,
          tasa: parseFloat(tasa),
          periodo,
          periodoConsulta,
          programa: programa || 'Todos los programas'
        });
        setLoadingCalculoTasa28(false);
      })
      .catch(error => {
        console.error('Error al calcular tasa de deserción periodo 2.8:', error);
        setErrorCalculoTasa28('Error al obtener datos de deserción periodo 2.8');
        setLoadingCalculoTasa28(false);
      });
  };

  const calcularTasaAusenciaIntersemestral = (jwt, periodo, programa, facultad = '', nivel = '') => {
    setLoadingCalculoTasaAusencia(true);
    setErrorCalculoTasaAusencia(null);
    
    // Obtener datos reales de ausencia intersemestral
    let urlAusencia = buildApiUrl('/apiDesercion/desercion/ausencia-intersemestral');
    const paramsAusencia = [];
    
    if (periodo) {
      paramsAusencia.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsAusencia.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsAusencia.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsAusencia.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsAusencia.push(`conCancelados=${conCancelados}`);
    
    if (paramsAusencia.length > 0) {
      urlAusencia += `?${paramsAusencia.join('&')}`;
    }
    
    // Obtener conteo real de matriculados (t-1 para ausencia intersemestral)
    let urlMatriculados = buildApiUrl('/apiDesercion/matriculas/conteo-t1');
    const paramsMatriculados = [];
    
    if (periodo) {
      paramsMatriculados.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsMatriculados.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsMatriculados.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsMatriculados.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsMatriculados.push(`conCancelados=${conCancelados}`);
    
    if (paramsMatriculados.length > 0) {
      urlMatriculados += `?${paramsMatriculados.join('&')}`;
    }
    
    // Hacer ambas peticiones en paralelo
    Promise.all([
      axios.get(urlAusencia, { headers: { Authorization: `Bearer ${jwt}` } }),
      axios.get(urlMatriculados, { headers: { Authorization: `Bearer ${jwt}` } })
    ])
      .then(([ausenciaResponse, matriculadosResponse]) => {
        const ausencias = ausenciaResponse.data.length;
        const matriculados = matriculadosResponse.data.cantidad;
        const periodoConsulta = matriculadosResponse.data.periodoConsulta;
        
        console.log('Ausencias intersemestrales obtenidas:', ausencias, 'URL:', urlAusencia);
        console.log('Matriculados obtenidos:', matriculados, 'URL:', urlMatriculados);
        console.log('Período consultado (t-1):', periodoConsulta);
        
        const tasa = matriculados > 0 ? ((ausencias / matriculados) * 100).toFixed(2) : 0;
        
        setDatosTasaAusencia({
          ausencias,
          matriculados,
          tasa: parseFloat(tasa),
          periodo,
          periodoConsulta,
          programa: programa || 'Todos los programas'
        });
        setLoadingCalculoTasaAusencia(false);
      })
      .catch(error => {
        console.error('Error al calcular tasa de ausencia intersemestral:', error);
        setErrorCalculoTasaAusencia('Error al obtener datos de ausencia intersemestral');
        setLoadingCalculoTasaAusencia(false);
      });
  };

  const calcularTasaDesercionCohorte = (jwt, cohorte, programa, hasta = null, facultad = '', nivel = '') => {
    setLoadingCalculoTasaCohorte(true);
    setErrorCalculoTasaCohorte(null);
    
    // Obtener datos de primíparos (cohorte)
    let urlPrimiparos = buildApiUrl('/apiDesercion/matriculas/primiparos');
    const paramsPrimiparos = [];
    
    if (cohorte) {
      paramsPrimiparos.push(`periodo=${encodeURIComponent(cohorte)}`);
    }
    if (programa) {
      paramsPrimiparos.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsPrimiparos.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsPrimiparos.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsPrimiparos.push(`conCancelados=${conCancelados}`);
    
    if (paramsPrimiparos.length > 0) {
      urlPrimiparos += `?${paramsPrimiparos.join('&')}`;
    }
    
    // Obtener datos de desertores de la cohorte
    let urlDesertores = buildApiUrl('/apiDesercion/desercion/cohorte');
    const paramsDesertores = [];
    
    if (cohorte) {
      paramsDesertores.push(`cohorte=${encodeURIComponent(cohorte)}`);
    }
    if (programa) {
      paramsDesertores.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsDesertores.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsDesertores.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    // Limitar el periodo máximo con el semestre seleccionado
    // Usar el parámetro 'hasta' si se proporciona, sino usar el estado
    const limiteHasta = hasta !== null ? hasta : (periodoSeleccionadoCohorte || '');
    if (limiteHasta) {
      paramsDesertores.push(`semestre=${encodeURIComponent(limiteHasta)}`);
    }
    paramsDesertores.push(`conCancelados=${conCancelados}`);
    
    if (paramsDesertores.length > 0) {
      urlDesertores += `?${paramsDesertores.join('&')}`;
    }
    
    // Hacer ambas peticiones en paralelo
    Promise.all([
      axios.get(urlPrimiparos, { headers: { Authorization: `Bearer ${jwt}` } }),
      axios.get(urlDesertores, { headers: { Authorization: `Bearer ${jwt}` } })
    ])
      .then(([primiparosResponse, desertoresResponse]) => {
        const primiparos = primiparosResponse.data.length;
        const desertores = desertoresResponse.data.length;
        
        console.log('Primíparos (cohorte):', primiparos, 'URL:', urlPrimiparos);
        console.log('Desertores de cohorte:', desertores, 'URL:', urlDesertores);
        
        const tasa = primiparos > 0 ? ((desertores / primiparos) * 100).toFixed(2) : 0;
        
        setDatosTasaDesercionCohorte({
          primiparos,
          desertores,
          tasa: parseFloat(tasa),
          cohorte,
          programa: programa || 'Todos los programas'
        });
        // Guardar los parámetros usados para el modal
        setUltimosParametrosCohorte({
          cohorte,
          programa: programa || '',
          hasta: limiteHasta,
          facultad: facultad || '',
          nivel: nivel || ''
        });
        setLoadingCalculoTasaCohorte(false);
      })
      .catch(error => {
        console.error('Error al calcular tasa de deserción por cohorte:', error);
        setErrorCalculoTasaCohorte('Error al obtener datos de deserción por cohorte');
        setLoadingCalculoTasaCohorte(false);
      });
  };

  const calcularTasaDesercionPromedio = (jwt, periodo, programa, facultad = '', nivel = '') => {
    setLoadingCalculoTasaPromedio(true);
    setErrorCalculoTasaPromedio(null);
    
    // Para TDPA necesitamos:
    // Numerador: Suma de desertores de todas las cohortes y semestres hasta el período seleccionado
    // Denominador: Primíparos únicos de todos los períodos anteriores hasta 2 períodos atrás del seleccionado
    
    let urlDesertores = buildApiUrl('/apiDesercion/desercion');
    let urlPrimiparosAcumulados = buildApiUrl('/apiDesercion/matriculas/primiparos-acumulados-hasta-periodo');
    
    const paramsDesertores = [];
    const paramsPrimiparos = [];
    
    if (periodo) {
      // Para tasa promedio acumulada, obtener todos los desertores hasta el período seleccionado
      paramsDesertores.push(`periodo=${encodeURIComponent(periodo)}`);
      paramsDesertores.push(`hastaPeriodo=true`);
      // Obtener primíparos acumulados hasta 2 períodos atrás del seleccionado
      paramsPrimiparos.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsDesertores.push(`programa=${encodeURIComponent(programa)}`);
      paramsPrimiparos.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsDesertores.push(`facultad=${encodeURIComponent(facultad)}`);
      paramsPrimiparos.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsDesertores.push(`nivel=${encodeURIComponent(nivel)}`);
      paramsPrimiparos.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsDesertores.push(`conCancelados=${conCancelados}`);
    paramsPrimiparos.push(`conCancelados=${conCancelados}`);
    
    if (paramsDesertores.length > 0) {
      urlDesertores += `?${paramsDesertores.join('&')}`;
    }
    if (paramsPrimiparos.length > 0) {
      urlPrimiparosAcumulados += `?${paramsPrimiparos.join('&')}`;
    }
    
    // Hacer las peticiones en paralelo
    Promise.all([
      axios.get(urlDesertores, { headers: { Authorization: `Bearer ${jwt}` } }),
      axios.get(urlPrimiparosAcumulados, { headers: { Authorization: `Bearer ${jwt}` } })
    ])
      .then(([desertoresResponse, primiparosResponse]) => {
        const desertores = desertoresResponse.data.length;
        const primiparos = primiparosResponse.data.length;
        
        console.log('Desertores totales (hasta período seleccionado):', desertores);
        console.log('Primíparos acumulados (hasta 2 períodos atrás):', primiparos);
        console.log('Período seleccionado:', periodo);
        
        const tasa = primiparos > 0 ? ((desertores / primiparos) * 100).toFixed(2) : 0;
        
        setDatosTasaDesercionPromedio({
          desertores,
          primiparos,
          tasa: parseFloat(tasa),
          periodo: periodo || 'Todos los períodos',
          periodoConsulta: `Período ${periodo}`,
          programa: programa || 'Todos los programas'
        });
        // Guardar los parámetros usados para el modal
        setUltimosParametrosTasaPromedio({
          periodo: periodo || null,
          programa: programa || null,
          conCancelados: conCancelados
        });
        setLoadingCalculoTasaPromedio(false);
      })
      .catch(error => {
        console.error('Error al calcular tasa de deserción promedio acumulada:', error);
        setErrorCalculoTasaPromedio('Error al obtener datos de deserción promedio acumulada');
        setLoadingCalculoTasaPromedio(false);
      });
  };

  const calcularTasaGraduacion = (jwt, periodo, programa, facultad = '', nivel = '') => {
    setLoadingCalculoTasaGraduacion(true);
    setErrorCalculoTasaGraduacion(null);
    
    // Para TGA necesitamos:
    // Numerador: Suma de graduados de todas las cohortes hasta el período seleccionado
    // Denominador: Primíparos únicos de todos los períodos anteriores hasta 2 períodos atrás del seleccionado
    
    let urlTasaGraduacion = buildApiUrl('/apiDesercion/desercion/tasa-graduacion/estadistica-periodo');
    const params = [];
    if (programa) {
      params.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      params.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      params.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    params.push(`conCancelados=${conCancelados}`);
    if (params.length > 0) {
      urlTasaGraduacion += `?${params.join('&')}`;
    }

    axios.get(urlTasaGraduacion, { headers: { Authorization: `Bearer ${jwt}` } })
      .then((response) => {
        const fila = response.data.find((row) => row.periodo === periodo);
        const graduados = fila?.graduados ?? 0;
        const primiparos = fila?.primiparos ?? 0;
        const tasa = fila?.tasa ?? 0;

        console.log('Graduados totales (hasta período seleccionado):', graduados);
        console.log('Primíparos acumulados (hasta 2 períodos atrás):', primiparos);
        console.log('Período seleccionado:', periodo);

        setDatosTasaGraduacion({
          graduados,
          primiparos,
          tasa: parseFloat(Number(tasa).toFixed(2)),
          periodo: periodo || 'Todos los períodos',
          periodoConsulta: `Período ${periodo}`,
          programa: programa || 'Todos los programas'
        });
        // Guardar los parámetros usados para el modal
        setUltimosParametrosTasaGraduacion({
          periodo: periodo || null,
          programa: programa || null,
          conCancelados: conCancelados
        });
        setLoadingCalculoTasaGraduacion(false);
      })
      .catch(error => {
        console.error('Error al calcular tasa de graduación acumulada:', error);
        setErrorCalculoTasaGraduacion('Error al obtener datos de graduación acumulada');
        setLoadingCalculoTasaGraduacion(false);
      });
  };

  const calcularTasaSupervivencia = (jwt, periodo, programa, facultad = '', nivel = '') => {
    setLoadingCalculoTasaSupervivencia(true);
    setErrorCalculoTasaSupervivencia(null);
    
    // Para TSs necesitamos:
    // Numerador: Matriculados en el período seleccionado (s)
    // Denominador: Primíparos acumulados hasta el período seleccionado (S)
    
    // Obtener matriculados del período seleccionado directamente
    let urlMatriculados = buildApiUrl('/apiDesercion/matriculas');
    const paramsMatriculados = [];
    
    if (periodo) {
      paramsMatriculados.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsMatriculados.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsMatriculados.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsMatriculados.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsMatriculados.push(`conCancelados=${conCancelados}`);
    
    if (paramsMatriculados.length > 0) {
      urlMatriculados += `?${paramsMatriculados.join('&')}`;
    }
    
    // Obtener primíparos acumulados hasta el período seleccionado (sin límite t-2)
    let urlPrimiparosAcumulados = buildApiUrl('/apiDesercion/matriculas/primiparos-acumulados-hasta-periodo');
    const paramsPrimiparos = [];
    
    if (periodo) {
      paramsPrimiparos.push(`periodo=${encodeURIComponent(periodo)}`);
    }
    if (programa) {
      paramsPrimiparos.push(`programa=${encodeURIComponent(programa)}`);
    }
    if (facultad) {
      paramsPrimiparos.push(`facultad=${encodeURIComponent(facultad)}`);
    }
    if (nivel) {
      paramsPrimiparos.push(`nivel=${encodeURIComponent(nivel)}`);
    }
    paramsPrimiparos.push(`conCancelados=${conCancelados}`);
    
    if (paramsPrimiparos.length > 0) {
      urlPrimiparosAcumulados += `?${paramsPrimiparos.join('&')}`;
    }
    
    // Hacer las peticiones en paralelo
    Promise.all([
      axios.get(urlMatriculados, { headers: { Authorization: `Bearer ${jwt}` } }),
      axios.get(urlPrimiparosAcumulados, { headers: { Authorization: `Bearer ${jwt}` } })
    ])
      .then(([matriculadosResponse, primiparosResponse]) => {
        const matriculados = Array.isArray(matriculadosResponse.data) ? matriculadosResponse.data.length : 0;
        const primiparos = primiparosResponse.data.length;
        
        console.log('Matriculados del período seleccionado:', matriculados);
        console.log('Primíparos acumulados hasta el período seleccionado:', primiparos);
        console.log('Período seleccionado:', periodo);
        
        const tasa = primiparos > 0 ? ((matriculados / primiparos) * 100).toFixed(2) : 0;
        
        setDatosTasaSupervivencia({
          matriculados,
          primiparos,
          tasa: parseFloat(tasa),
          periodo: periodo || 'Todos los períodos',
          periodoConsulta: `Período ${periodo}`,
          programa: programa || 'Todos los programas'
        });
        // Guardar los parámetros usados para el modal
        setUltimosParametrosTasaSupervivencia({
          periodo: periodo || null,
          programa: programa || null,
          conCancelados: conCancelados
        });
        setLoadingCalculoTasaSupervivencia(false);
      })
      .catch(error => {
        console.error('Error al calcular tasa de supervivencia:', error);
        setErrorCalculoTasaSupervivencia('Error al obtener datos de supervivencia');
        setLoadingCalculoTasaSupervivencia(false);
      });
  };

  const handleClickPrimiparosCohorte = () => {
    setMostrarModalPrimiparosCohorte(true);
    setLoadingPrimiparosCohorte(true);
    setListaPrimiparosCohorte([]);
    
    let url;
    const params = [];
    
    // Si estamos en gráfico de tasa promedio acumulada, usar el endpoint de primíparos acumulados
    if (tasaDesercionPromedioGraficoModalContext.periodo) {
      url = buildApiUrl('/apiDesercion/matriculas/primiparos-acumulados');
      params.push(`periodo=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.periodo)}`);
      if (tasaDesercionPromedioGraficoModalContext.programa) {
        params.push(`programa=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.programa)}`);
      }
      if (tasaDesercionPromedioGraficoModalContext.facultad) {
        params.push(`facultad=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.facultad)}`);
      }
      if (tasaDesercionPromedioGraficoModalContext.nivel) {
        params.push(`nivel=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.nivel)}`);
      }
      params.push(`conCancelados=${conCancelados}`);
    } else if (vista === 'tasa-desercion-promedio' && ultimosParametrosTasaPromedio) {
      url = buildApiUrl('/apiDesercion/matriculas/primiparos-acumulados');
      if (ultimosParametrosTasaPromedio.periodo) {
        params.push(`periodo=${encodeURIComponent(ultimosParametrosTasaPromedio.periodo)}`);
      }
      if (ultimosParametrosTasaPromedio.programa) {
        params.push(`programa=${encodeURIComponent(ultimosParametrosTasaPromedio.programa)}`);
      }
      params.push(`conCancelados=${ultimosParametrosTasaPromedio.conCancelados}`);
    } else {
      // Para otras vistas, usar el endpoint de primíparos de cohorte
      url = buildApiUrl('/apiDesercion/matriculas/primiparos');
      const usarGraficoCohorte = Boolean(tasaDesercionCohorteGraficoModalContext.cohorte);
      // Usar la cohorte seleccionada
      const cohorteActual = usarGraficoCohorte
        ? tasaDesercionCohorteGraficoModalContext.cohorte
        : (cohorteSeleccionada || (periodosTasaDesercionCohorte.length > 0 ? periodosTasaDesercionCohorte[0] : ''));
      if (cohorteActual) {
        params.push(`periodo=${encodeURIComponent(cohorteActual)}`);
      }
      
      // Usar el programa seleccionado si hay uno
      const programaActual = usarGraficoCohorte
        ? (tasaDesercionCohorteGraficoModalContext.programa || '')
        : programaSeleccionadoCohorte;
      if (programaActual) {
        params.push(`programa=${encodeURIComponent(programaActual)}`);
      }

      const facultadActual = usarGraficoCohorte ? (tasaDesercionCohorteGraficoModalContext.facultad || '') : '';
      if (facultadActual) {
        params.push(`facultad=${encodeURIComponent(facultadActual)}`);
      }

      const nivelActual = usarGraficoCohorte ? (tasaDesercionCohorteGraficoModalContext.nivel || '') : '';
      if (nivelActual) {
        params.push(`nivel=${encodeURIComponent(nivelActual)}`);
      }
      
      params.push(`conCancelados=${conCancelados}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    console.log('Obteniendo primíparos:', url);
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        console.log('Primíparos obtenidos:', response.data.length);
        // Normalizar al mismo esquema de columnas que Matriculados/Desertores
        const normalizados = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.estudiante || item.ESTUDIANTE || item.NombreEstudiante || '',
          codigo: item.codigo || item.CODIGO || item.CodEstudiante || '',
          programa: item.programa || item.PROGRAMA || '',
          facultad: item.facultad || item.FACULTAD || '',
          nivel: item.nivel || item.NIVEL || '',
          periodoIngreso: item.peringreso || item.PERINGRESO || item.PeriodoIngreso || '',
          estadoMatricula: item.estadomatricula || item.ESTADOMATRICULA || item.EstadoMatricula || '',
          estadoEstudiante: item.estadoEstudiante || item.EstadoEstudiante || item.ESTADOESTUDIANTE || '',
          periodoSiguiente: item.NombrePeriodo || item.nombrePeriodo || item.primerPeriodo || '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        setListaPrimiparosCohorte(normalizados);
        setLoadingPrimiparosCohorte(false);
      })
      .catch(error => {
        console.error('Error al obtener los primíparos:', error);
        setListaPrimiparosCohorte([]);
        setLoadingPrimiparosCohorte(false);
      });
  };

  const handleClickDesertores = () => {
    // Usar el mismo endpoint que la sección de deserción
    setMostrarModalDesertores(true);
    setLoadingDesertores(true);
    setListaDesertores([]);
    
    let url = buildApiUrl('/apiDesercion/desercion');
    const params = [];
    
    // Si estamos en gráfico de tasa promedio acumulada, usar el contexto del gráfico
    if (tasaDesercionPromedioGraficoModalContext.periodo) {
      params.push(`periodo=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.periodo)}`);
      params.push(`hastaPeriodo=true`);
      if (tasaDesercionPromedioGraficoModalContext.programa) {
        params.push(`programa=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.programa)}`);
      }
      if (tasaDesercionPromedioGraficoModalContext.facultad) {
        params.push(`facultad=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.facultad)}`);
      }
      if (tasaDesercionPromedioGraficoModalContext.nivel) {
        params.push(`nivel=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.nivel)}`);
      }
      params.push(`conCancelados=${conCancelados}`);
    } else if (vista === 'tasa-desercion-promedio' && ultimosParametrosTasaPromedio) {
      // Para tasa promedio acumulada, obtener todos los desertores hasta el período seleccionado
      if (ultimosParametrosTasaPromedio.periodo) {
        params.push(`periodo=${encodeURIComponent(ultimosParametrosTasaPromedio.periodo)}`);
        params.push(`hastaPeriodo=true`);
      }
      if (ultimosParametrosTasaPromedio.programa) {
        params.push(`programa=${encodeURIComponent(ultimosParametrosTasaPromedio.programa)}`);
      }
      params.push(`conCancelados=${ultimosParametrosTasaPromedio.conCancelados}`);
    } else {
      const usarGraficoTasa = Boolean(tasaDesercionGraficoModalContext.periodo);
      // Para tasa de deserción anual, usar el período seleccionado
      const periodoActual = usarGraficoTasa
        ? tasaDesercionGraficoModalContext.periodo
        : (periodoSeleccionadoTasa || (periodosTasaDesercion.length > 0 ? periodosTasaDesercion[0] : ''));
      if (periodoActual) {
        params.push(`periodo=${encodeURIComponent(periodoActual)}`);
      }
      
      // Usar el programa seleccionado si hay uno
      const programaActual = usarGraficoTasa ? (tasaDesercionGraficoModalContext.programa || '') : programaSeleccionadoTasa;
      if (programaActual) {
        params.push(`programa=${encodeURIComponent(programaActual)}`);
      }

      const facultadActual = usarGraficoTasa ? (tasaDesercionGraficoModalContext.facultad || '') : '';
      if (facultadActual) {
        params.push(`facultad=${encodeURIComponent(facultadActual)}`);
      }

      const nivelActual = usarGraficoTasa ? (tasaDesercionGraficoModalContext.nivel || '') : '';
      if (nivelActual) {
        params.push(`nivel=${encodeURIComponent(nivelActual)}`);
      }
      
      params.push(`conCancelados=${conCancelados}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        // Mapear los datos del endpoint de deserción al formato del modal
        const desertoresReales = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.estudiante,
          codigo: item.codigo,
          programa: item.programa,
          facultad: item.facultad || '',
          nivel: item.nivel,
          periodoIngreso: item.peringreso,
          estadoMatricula: item.estadomatricula,
          estadoEstudiante: item.estadoEstudiante,
          periodoSiguiente: item.periodoSiguiente,
          tipodocumento: item.tipodocumento || '',
          documento: item.documento || '',
          telefonoppal: item.telefonoppal || '',
          celular: item.celular || '',
          correounac: item.correounac || '',
          correootro: item.correootro || '',
          muniprocedencia: item.muniprocedencia || '',
          dptoprocedencia: item.dptoprocedencia || '',
          paisprocedencia: item.paisprocedencia || ''
        }));
        
        setListaDesertores(desertoresReales);
        setLoadingDesertores(false);
      })
      .catch(error => {
        console.error('Error al obtener los desertores:', error);
        setListaDesertores([]);
        setLoadingDesertores(false);
      });
  };

  const handleClickDesertores28 = () => {
    setMostrarModalDesertores28(true);
    setLoadingDesertores28(true);
    setListaDesertores28([]);
    
    let url = buildApiUrl('/apiDesercion/desercion');
    const params = [];
    
    const usarGrafico28 = Boolean(tasaDesercion28GraficoModalContext.periodo);
    const periodoActual = usarGrafico28
      ? tasaDesercion28GraficoModalContext.periodo
      : (periodoSeleccionadoTasa28 || (periodosTasaDesercion28.length > 0 ? periodosTasaDesercion28[0] : ''));
    if (periodoActual) {
      params.push(`periodo=${encodeURIComponent(periodoActual)}`);
    }
    
    const programaActual = usarGrafico28 ? tasaDesercion28GraficoModalContext.programa : programaSeleccionadoTasa28;
    if (programaActual) {
      params.push(`programa=${encodeURIComponent(programaActual)}`);
    }
    if (usarGrafico28 && tasaDesercion28GraficoModalContext.facultad) {
      params.push(`facultad=${encodeURIComponent(tasaDesercion28GraficoModalContext.facultad)}`);
    }
    if (usarGrafico28 && tasaDesercion28GraficoModalContext.nivel) {
      params.push(`nivel=${encodeURIComponent(tasaDesercion28GraficoModalContext.nivel)}`);
    }
    
    params.push(`conCancelados=${conCancelados}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const desertoresReales = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.estudiante,
          codigo: item.codigo,
          programa: item.programa,
          facultad: item.facultad || '',
          nivel: item.nivel,
          periodoIngreso: item.peringreso,
          estadoMatricula: item.estadomatricula,
          estadoEstudiante: item.estadoEstudiante,
          nombrePeriodo: item.periodoSiguiente || item.periodosiguiente || '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        setListaDesertores28(desertoresReales);
        setLoadingDesertores28(false);
      })
      .catch(error => {
        console.error('Error al obtener los desertores:', error);
        setListaDesertores28([]);
        setLoadingDesertores28(false);
      });
  };

  const handleClickMatriculados28 = () => {
    setMostrarModalMatriculados28(true);
    setLoadingMatriculados28(true);
    setListaMatriculados28([]);
    
    let url = buildApiUrl('/apiDesercion/matriculas/matriculados-no-graduados-t2');
    const params = [];
    
    const usarGrafico28 = Boolean(tasaDesercion28GraficoModalContext.periodo);
    const periodoActual = usarGrafico28
      ? tasaDesercion28GraficoModalContext.periodo
      : (periodoSeleccionadoTasa28 || (periodosTasaDesercion28.length > 0 ? periodosTasaDesercion28[0] : ''));
    if (periodoActual) {
      params.push(`periodo=${encodeURIComponent(periodoActual)}`);
    }
    
    const programaActual = usarGrafico28 ? (tasaDesercion28GraficoModalContext.programa || '') : programaSeleccionadoTasa28;
    if (programaActual) {
      params.push(`programa=${encodeURIComponent(programaActual)}`);
    }
    if (usarGrafico28 && tasaDesercion28GraficoModalContext.facultad) {
      params.push(`facultad=${encodeURIComponent(tasaDesercion28GraficoModalContext.facultad)}`);
    }
    if (usarGrafico28 && tasaDesercion28GraficoModalContext.nivel) {
      params.push(`nivel=${encodeURIComponent(tasaDesercion28GraficoModalContext.nivel)}`);
    }
    
    params.push(`conCancelados=${conCancelados}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const matriculadosReales = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.ESTUDIANTE || item.estudiante || item.NombreEstudiante || '',
          codigo: item.CODIGO || item.codigo || item.CodEstudiante || '',
          programa: item.PROGRAMA || item.programa || '',
          facultad: item.FACULTAD || item.facultad || '',
          nivel: item.NIVEL || item.nivel || '',
          periodoIngreso: item.PERINGRESO || item.peringreso || item.PeriodoIngreso || '',
          estadoMatricula: item.ESTADOMATRICULA || item.estadomatricula || item.EstadoMatricula || '',
          estadoEstudiante: item.ESTADOESTUDIANTE || item.EstadoEstudiante || item.estadoEstudiante || '',
          nombrePeriodo: item.NombrePeriodo || item.nombrePeriodo || '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        setListaMatriculados28(matriculadosReales);
        setLoadingMatriculados28(false);
      })
      .catch(error => {
        console.error('Error al obtener los matriculados no graduados:', error);
        setListaMatriculados28([]);
        setLoadingMatriculados28(false);
      });
  };

  const handleClickDesertoresCohorte = () => {
    // Lista de desertores para cohorte: usar exactamente los mismos parámetros del último cálculo
    setMostrarModalDesertores(true);
    setLoadingDesertores(true);
    setListaDesertores([]);

    let url = buildApiUrl('/apiDesercion/desercion/cohorte');
    const params = [];

    const usarGraficoCohorte = Boolean(tasaDesercionCohorteGraficoModalContext.cohorte);
    const parametrosBase = usarGraficoCohorte
      ? {
          cohorte: tasaDesercionCohorteGraficoModalContext.cohorte,
          programa: tasaDesercionCohorteGraficoModalContext.programa,
          hasta: tasaDesercionCohorteGraficoModalContext.semestre,
          facultad: tasaDesercionCohorteGraficoModalContext.facultad,
          nivel: tasaDesercionCohorteGraficoModalContext.nivel
        }
      : ultimosParametrosCohorte;

    if (!parametrosBase) {
      console.error('No hay parámetros guardados del último cálculo');
      setLoadingDesertores(false);
      return;
    }

    if (parametrosBase.cohorte) {
      params.push(`cohorte=${encodeURIComponent(parametrosBase.cohorte)}`);
    }

    if (parametrosBase.hasta) {
      params.push(`semestre=${encodeURIComponent(parametrosBase.hasta)}`);
    }

    if (parametrosBase.programa) {
      params.push(`programa=${encodeURIComponent(parametrosBase.programa)}`);
    }

    if (parametrosBase.facultad) {
      params.push(`facultad=${encodeURIComponent(parametrosBase.facultad)}`);
    }

    if (parametrosBase.nivel) {
      params.push(`nivel=${encodeURIComponent(parametrosBase.nivel)}`);
    }
    params.push(`conCancelados=${conCancelados}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const desertores = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.ESTUDIANTE || item.estudiante,
          codigo: item.CODIGO || item.codigo,
          programa: item.PROGRAMA || item.programa,
          facultad: item.facultad || '',
          nivel: item.NIVEL || item.nivel,
          periodoIngreso: item.periodoCohorte || item.PERINGRESO || item.peringreso,
          estadoMatricula: item.ESTADOMATRICULA || item.estadomatricula,
          estadoEstudiante: item.EstadoEstudiante || item.estadoEstudiante,
          periodoSiguiente: item.periodoMatricula || item.periodoSemestre || item.NombrePeriodo || '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));

        setListaDesertores(desertores);
        setLoadingDesertores(false);
      })
      .catch(error => {
        console.error('Error al obtener los desertores de cohorte:', error);
        setListaDesertores([]);
        setLoadingDesertores(false);
      });
  };

  const handleClickGraduados = () => {
    // Lista de graduados para tasa de graduación: usar exactamente los mismos parámetros del último cálculo
    setMostrarModalGraduados(true);
    setLoadingGraduadosModal(true);
    setListaGraduadosModal([]);

    const usarGraficoGraduacion = Boolean(tasaGraduacionGraficoModalContext.periodo);
    if (!usarGraficoGraduacion && !ultimosParametrosTasaGraduacion) {
      console.error('No hay parámetros guardados del último cálculo');
      setLoadingGraduadosModal(false);
      return;
    }

    let url = buildApiUrl('/apiDesercion/matriculas/graduados-acumulados');
    const params = [];

    if (usarGraficoGraduacion) {
      params.push(`periodo=${encodeURIComponent(tasaGraduacionGraficoModalContext.periodo)}`);
      if (tasaGraduacionGraficoModalContext.programa) {
        params.push(`programa=${encodeURIComponent(tasaGraduacionGraficoModalContext.programa)}`);
      }
      if (tasaGraduacionGraficoModalContext.facultad) {
        params.push(`facultad=${encodeURIComponent(tasaGraduacionGraficoModalContext.facultad)}`);
      }
      if (tasaGraduacionGraficoModalContext.nivel) {
        params.push(`nivel=${encodeURIComponent(tasaGraduacionGraficoModalContext.nivel)}`);
      }
      params.push(`conCancelados=${conCancelados}`);
    } else {
      if (ultimosParametrosTasaGraduacion.periodo) {
        params.push(`periodo=${encodeURIComponent(ultimosParametrosTasaGraduacion.periodo)}`);
      }
      if (ultimosParametrosTasaGraduacion.programa) {
        params.push(`programa=${encodeURIComponent(ultimosParametrosTasaGraduacion.programa)}`);
      }
      params.push(`conCancelados=${ultimosParametrosTasaGraduacion.conCancelados}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const graduados = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.ESTUDIANTE || item.estudiante,
          codigo: item.CODIGO || item.codigo,
          programa: item.PROGRAMA || item.programa,
          nivel: item.NIVEL || item.nivel,
          periodoIngreso: item.PERINGRESO || item.peringreso,
          estadoMatricula: item.ESTADOMATRICULA || item.estadomatricula,
          estadoEstudiante: item.EstadoEstudiante || item.estadoEstudiante,
          periodoEgreso: item.periodo_egreso || item.PERIODO_EGRESO || '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));

        setListaGraduadosModal(graduados);
        setLoadingGraduadosModal(false);
      })
      .catch(error => {
        console.error('Error al obtener los graduados:', error);
        setListaGraduadosModal([]);
        setLoadingGraduadosModal(false);
      });
  };

  const handleClickMatriculadosSupervivencia = () => {
    setMostrarModalMatriculadosSupervivencia(true);
    setLoadingMatriculadosSupervivencia(true);
    setListaMatriculadosSupervivencia([]);
    
    const usarGraficoSupervivencia = Boolean(tasaSupervivenciaGraficoModalContext.periodo);
    if (!usarGraficoSupervivencia && !ultimosParametrosTasaSupervivencia) {
      console.error('No hay parámetros guardados del último cálculo');
      setLoadingMatriculadosSupervivencia(false);
      return;
    }
    
    let url = buildApiUrl('/apiDesercion/matriculas');
    const params = [];
    
    if (usarGraficoSupervivencia) {
      params.push(`periodo=${encodeURIComponent(tasaSupervivenciaGraficoModalContext.periodo)}`);
      if (tasaSupervivenciaGraficoModalContext.programa) {
        params.push(`programa=${encodeURIComponent(tasaSupervivenciaGraficoModalContext.programa)}`);
      }
      if (tasaSupervivenciaGraficoModalContext.facultad) {
        params.push(`facultad=${encodeURIComponent(tasaSupervivenciaGraficoModalContext.facultad)}`);
      }
      if (tasaSupervivenciaGraficoModalContext.nivel) {
        params.push(`nivel=${encodeURIComponent(tasaSupervivenciaGraficoModalContext.nivel)}`);
      }
      params.push(`conCancelados=${conCancelados}`);
    } else {
      if (ultimosParametrosTasaSupervivencia.periodo) {
        params.push(`periodo=${encodeURIComponent(ultimosParametrosTasaSupervivencia.periodo)}`);
      }
      if (ultimosParametrosTasaSupervivencia.programa) {
        params.push(`programa=${encodeURIComponent(ultimosParametrosTasaSupervivencia.programa)}`);
      }
      params.push(`conCancelados=${ultimosParametrosTasaSupervivencia.conCancelados}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const normalizados = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.ESTUDIANTE || item.estudiante || item.NombreEstudiante || '',
          codigo: item.CODIGO || item.codigo || item.CodEstudiante || '',
          programa: item.PROGRAMA || item.programa || '',
          facultad: item.FACULTAD || item.facultad || '',
          nivel: item.NIVEL || item.nivel || '',
          periodoIngreso: item.PERINGRESO || item.peringreso || item.PeriodoIngreso || '',
          estadoMatricula: item.ESTADOMATRICULA || item.estadomatricula || item.EstadoMatricula || '',
          estadoEstudiante: item.EstadoEstudiante || item.estadoEstudiante || item.ESTADOESTUDIANTE || '',
          periodoSiguiente: '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        setListaMatriculadosSupervivencia(normalizados);
        setLoadingMatriculadosSupervivencia(false);
      })
      .catch(error => {
        console.error('Error al obtener los matriculados de supervivencia:', error);
        setListaMatriculadosSupervivencia([]);
        setLoadingMatriculadosSupervivencia(false);
      });
  };

  const handleClickPrimiparosSupervivencia = () => {
    setMostrarModalPrimiparosSupervivencia(true);
    setLoadingPrimiparosSupervivencia(true);
    setListaPrimiparosSupervivencia([]);
    
    const usarGraficoSupervivencia = Boolean(tasaSupervivenciaGraficoModalContext.periodo);
    if (!usarGraficoSupervivencia && !ultimosParametrosTasaSupervivencia) {
      console.error('No hay parámetros guardados del último cálculo');
      setLoadingPrimiparosSupervivencia(false);
      return;
    }
    
    let url = buildApiUrl('/apiDesercion/matriculas/primiparos-acumulados-hasta-periodo');
    const params = [];
    
    if (usarGraficoSupervivencia) {
      params.push(`periodo=${encodeURIComponent(tasaSupervivenciaGraficoModalContext.periodo)}`);
      if (tasaSupervivenciaGraficoModalContext.programa) {
        params.push(`programa=${encodeURIComponent(tasaSupervivenciaGraficoModalContext.programa)}`);
      }
      if (tasaSupervivenciaGraficoModalContext.facultad) {
        params.push(`facultad=${encodeURIComponent(tasaSupervivenciaGraficoModalContext.facultad)}`);
      }
      if (tasaSupervivenciaGraficoModalContext.nivel) {
        params.push(`nivel=${encodeURIComponent(tasaSupervivenciaGraficoModalContext.nivel)}`);
      }
      params.push(`conCancelados=${conCancelados}`);
    } else {
      if (ultimosParametrosTasaSupervivencia.periodo) {
        params.push(`periodo=${encodeURIComponent(ultimosParametrosTasaSupervivencia.periodo)}`);
      }
      if (ultimosParametrosTasaSupervivencia.programa) {
        params.push(`programa=${encodeURIComponent(ultimosParametrosTasaSupervivencia.programa)}`);
      }
      params.push(`conCancelados=${ultimosParametrosTasaSupervivencia.conCancelados}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const normalizados = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.ESTUDIANTE || item.estudiante || item.NombreEstudiante || '',
          codigo: item.CODIGO || item.codigo || item.CodEstudiante || '',
          programa: item.PROGRAMA || item.programa || '',
          facultad: item.FACULTAD || item.facultad || '',
          nivel: item.NIVEL || item.nivel || '',
          periodoIngreso: item.PERINGRESO || item.peringreso || item.PeriodoIngreso || '',
          estadoMatricula: item.ESTADOMATRICULA || item.estadomatricula || item.EstadoMatricula || '',
          estadoEstudiante: item.ESTADOESTUDIANTE || item.EstadoEstudiante || item.estadoEstudiante || '',
          periodoSiguiente: '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        setListaPrimiparosSupervivencia(normalizados);
        setLoadingPrimiparosSupervivencia(false);
      })
      .catch(error => {
        console.error('Error al obtener los primíparos de supervivencia:', error);
        setListaPrimiparosSupervivencia([]);
        setLoadingPrimiparosSupervivencia(false);
      });
  };

  const handleClickPrimiparosGraduacion = () => {
    setMostrarModalPrimiparosGraduacion(true);
    setLoadingPrimiparosGraduacion(true);
    setListaPrimiparosGraduacion([]);
    
    let url = buildApiUrl('/apiDesercion/matriculas/primiparos-acumulados-hasta-periodo');
    const params = [];
    
    const usarGraficoGraduacion = Boolean(tasaGraduacionGraficoModalContext.periodo);
    if (usarGraficoGraduacion) {
      params.push(`periodo=${encodeURIComponent(tasaGraduacionGraficoModalContext.periodo)}`);
      if (tasaGraduacionGraficoModalContext.programa) {
        params.push(`programa=${encodeURIComponent(tasaGraduacionGraficoModalContext.programa)}`);
      }
      if (tasaGraduacionGraficoModalContext.facultad) {
        params.push(`facultad=${encodeURIComponent(tasaGraduacionGraficoModalContext.facultad)}`);
      }
      if (tasaGraduacionGraficoModalContext.nivel) {
        params.push(`nivel=${encodeURIComponent(tasaGraduacionGraficoModalContext.nivel)}`);
      }
      params.push(`conCancelados=${conCancelados}`);
    } else if (ultimosParametrosTasaGraduacion) {
      if (ultimosParametrosTasaGraduacion.periodo) {
        params.push(`periodo=${encodeURIComponent(ultimosParametrosTasaGraduacion.periodo)}`);
      }
      if (ultimosParametrosTasaGraduacion.programa) {
        params.push(`programa=${encodeURIComponent(ultimosParametrosTasaGraduacion.programa)}`);
      }
      params.push(`conCancelados=${ultimosParametrosTasaGraduacion.conCancelados}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const primiparos = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.ESTUDIANTE || item.estudiante,
          codigo: item.CODIGO || item.codigo,
          programa: item.PROGRAMA || item.programa,
          facultad: item.FACULTAD || item.facultad || '',
          nivel: item.NIVEL || item.nivel,
          periodoIngreso: item.PERINGRESO || item.peringreso,
          estadoMatricula: item.ESTADOMATRICULA || item.estadomatricula,
          estadoEstudiante: item.ESTADOESTUDIANTE || item.EstadoEstudiante || item.estadoEstudiante || '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        
        setListaPrimiparosGraduacion(primiparos);
        setLoadingPrimiparosGraduacion(false);
      })
      .catch(error => {
        console.error('Error al obtener los primíparos:', error);
        setListaPrimiparosGraduacion([]);
        setLoadingPrimiparosGraduacion(false);
      });
  };

  const handleClickPrimiparosPromedio = () => {
    setMostrarModalPrimiparosPromedio(true);
    setLoadingPrimiparosPromedio(true);
    setListaPrimiparosPromedio([]);

    let url = buildApiUrl('/apiDesercion/matriculas/primiparos-acumulados-hasta-periodo');
    const params = [];

    const usarGraficoPromedio = Boolean(tasaDesercionPromedioGraficoModalContext.periodo);
    if (usarGraficoPromedio) {
      params.push(`periodo=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.periodo)}`);
      if (tasaDesercionPromedioGraficoModalContext.programa) {
        params.push(`programa=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.programa)}`);
      }
      if (tasaDesercionPromedioGraficoModalContext.facultad) {
        params.push(`facultad=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.facultad)}`);
      }
      if (tasaDesercionPromedioGraficoModalContext.nivel) {
        params.push(`nivel=${encodeURIComponent(tasaDesercionPromedioGraficoModalContext.nivel)}`);
      }
      params.push(`conCancelados=${conCancelados}`);
    } else if (ultimosParametrosTasaPromedio) {
      if (ultimosParametrosTasaPromedio.periodo) {
        params.push(`periodo=${encodeURIComponent(ultimosParametrosTasaPromedio.periodo)}`);
      }
      if (ultimosParametrosTasaPromedio.programa) {
        params.push(`programa=${encodeURIComponent(ultimosParametrosTasaPromedio.programa)}`);
      }
      params.push(`conCancelados=${ultimosParametrosTasaPromedio.conCancelados}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const primiparos = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.ESTUDIANTE || item.estudiante,
          codigo: item.CODIGO || item.codigo,
          programa: item.PROGRAMA || item.programa,
          facultad: item.FACULTAD || item.facultad || '',
          nivel: item.NIVEL || item.nivel,
          periodoIngreso: item.PERINGRESO || item.peringreso,
          estadoMatricula: item.ESTADOMATRICULA || item.estadomatricula,
          estadoEstudiante: item.ESTADOESTUDIANTE || item.EstadoEstudiante || item.estadoEstudiante || '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        setListaPrimiparosPromedio(primiparos);
        setLoadingPrimiparosPromedio(false);
      })
      .catch(error => {
        console.error('Error al obtener los primíparos (promedio):', error);
        setListaPrimiparosPromedio([]);
        setLoadingPrimiparosPromedio(false);
      });
  };

  const handleClickAusenciaIntersemestral = () => {
    setMostrarModalAusenciaIntersemestral(true);
    setLoadingAusenciaIntersemestralModal(true);
    setListaAusenciaIntersemestral([]);
    
    let url = buildApiUrl('/apiDesercion/desercion/ausencia-intersemestral');
    const params = [];
    
    const usarGraficoAusencia = Boolean(tasaAusenciaGraficoModalContext.periodo);
    const periodoActual = usarGraficoAusencia
      ? tasaAusenciaGraficoModalContext.periodo
      : (periodoSeleccionadoTasaAusencia || (periodosTasaAusencia.length > 0 ? periodosTasaAusencia[0] : ''));
    if (periodoActual) {
      params.push(`periodo=${encodeURIComponent(periodoActual)}`);
    }
    
    const programaActual = usarGraficoAusencia ? tasaAusenciaGraficoModalContext.programa : programaSeleccionadoTasaAusencia;
    if (programaActual) {
      params.push(`programa=${encodeURIComponent(programaActual)}`);
    }
    if (usarGraficoAusencia && tasaAusenciaGraficoModalContext.facultad) {
      params.push(`facultad=${encodeURIComponent(tasaAusenciaGraficoModalContext.facultad)}`);
    }
    if (usarGraficoAusencia && tasaAusenciaGraficoModalContext.nivel) {
      params.push(`nivel=${encodeURIComponent(tasaAusenciaGraficoModalContext.nivel)}`);
    }
    
    params.push(`conCancelados=${conCancelados}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        const ausenciasReales = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.estudiante,
          codigo: item.codigo,
          programa: item.programa,
          facultad: item.facultad || '',
          nivel: item.nivel,
          periodoIngreso: item.peringreso,
          estadoMatricula: item.estadomatricula,
          estadoEstudiante: item.estadoEstudiante,
          periodoSiguiente: item.periodoSiguiente,
          tipodocumento: item.tipodocumento || '',
          documento: item.documento || '',
          telefonoppal: item.telefonoppal || '',
          celular: item.celular || '',
          correounac: item.correounac || '',
          correootro: item.correootro || '',
          muniprocedencia: item.muniprocedencia || '',
          dptoprocedencia: item.dptoprocedencia || '',
          paisprocedencia: item.paisprocedencia || ''
        }));
        
        setListaAusenciaIntersemestral(ausenciasReales);
        setLoadingAusenciaIntersemestralModal(false);
      })
      .catch(error => {
        console.error('Error al obtener las ausencias intersemestrales:', error);
        setListaAusenciaIntersemestral([]);
        setLoadingAusenciaIntersemestralModal(false);
      });
  };

  const handleClickMatriculadosAusencia = () => {
    setMostrarModalMatriculadosAusencia(true);
    setLoadingMatriculadosAusencia(true);
    setListaMatriculadosAusencia([]);

    const usarGraficoAusencia = Boolean(tasaAusenciaGraficoModalContext.periodo);
    const periodoActual = usarGraficoAusencia
      ? tasaAusenciaGraficoModalContext.periodo
      : (periodoSeleccionadoTasaAusencia || (periodosTasaAusencia.length > 0 ? periodosTasaAusencia[0] : ''));
    const periodoConsulta = getPeriodoAnterior1(periodoActual);
    if (!periodoConsulta) {
      setLoadingMatriculadosAusencia(false);
      return;
    }

    let url = buildApiUrl('/apiDesercion/matriculas');
    const params = [`periodo=${encodeURIComponent(periodoConsulta)}`];

    const programaActual = usarGraficoAusencia ? tasaAusenciaGraficoModalContext.programa : programaSeleccionadoTasaAusencia;
    if (programaActual) {
      params.push(`programa=${encodeURIComponent(programaActual)}`);
    }
    if (usarGraficoAusencia && tasaAusenciaGraficoModalContext.facultad) {
      params.push(`facultad=${encodeURIComponent(tasaAusenciaGraficoModalContext.facultad)}`);
    }
    if (usarGraficoAusencia && tasaAusenciaGraficoModalContext.nivel) {
      params.push(`nivel=${encodeURIComponent(tasaAusenciaGraficoModalContext.nivel)}`);
    }
    params.push(`conCancelados=${conCancelados}`);
    url += `?${params.join('&')}`;

    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        const normalizados = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.ESTUDIANTE || item.estudiante || item.NombreEstudiante || '',
          codigo: item.CODIGO || item.codigo || item.CodEstudiante || '',
          programa: item.PROGRAMA || item.programa || '',
          facultad: item.FACULTAD || item.facultad || '',
          nivel: item.NIVEL || item.nivel || '',
          periodoIngreso: item.PERINGRESO || item.peringreso || item.PeriodoIngreso || '',
          estadoMatricula: item.ESTADOMATRICULA || item.estadomatricula || item.EstadoMatricula || '',
          estadoEstudiante: item.EstadoEstudiante || item.estadoEstudiante || item.ESTADOESTUDIANTE || '',
          periodoSiguiente: '',
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        setListaMatriculadosAusencia(normalizados);
        setLoadingMatriculadosAusencia(false);
      })
      .catch(error => {
        console.error('Error al obtener los matriculados para ausencia:', error);
        setListaMatriculadosAusencia([]);
        setLoadingMatriculadosAusencia(false);
      });
  };

  const handleClickMatriculados = () => {
    // Usar el endpoint específico para tasa de deserción (matriculados de 2 períodos atrás)
    setMostrarModalMatriculados(true);
    setLoadingMatriculados(true);
    setListaMatriculados([]);
    
    let url = buildApiUrl('/apiDesercion/matriculas/tasa-desercion');
    const params = [];
    
    const usarGraficoTasa = Boolean(tasaDesercionGraficoModalContext.periodo);
    // Usar el período seleccionado o el predeterminado
    const periodoActual = usarGraficoTasa
      ? tasaDesercionGraficoModalContext.periodo
      : (periodoSeleccionadoTasa || (periodosTasaDesercion.length > 0 ? periodosTasaDesercion[0] : ''));
    if (periodoActual) {
      params.push(`periodo=${encodeURIComponent(periodoActual)}`);
    }
    
    // Usar el programa seleccionado si hay uno
    const programaActual = usarGraficoTasa ? (tasaDesercionGraficoModalContext.programa || '') : programaSeleccionadoTasa;
    if (programaActual) {
      params.push(`programa=${encodeURIComponent(programaActual)}`);
    }

    const facultadActual = usarGraficoTasa ? (tasaDesercionGraficoModalContext.facultad || '') : '';
    if (facultadActual) {
      params.push(`facultad=${encodeURIComponent(facultadActual)}`);
    }

    const nivelActual = usarGraficoTasa ? (tasaDesercionGraficoModalContext.nivel || '') : '';
    if (nivelActual) {
      params.push(`nivel=${encodeURIComponent(nivelActual)}`);
    }
    
    params.push(`conCancelados=${conCancelados}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        // Mapear al mismo esquema visual de desertores
        const periodoSiguienteRef = datosTasaDesercion?.periodo || '';
        const normalizados = response.data.map((item, index) => ({
          id: index + 1,
          nombre: item.estudiante || item.ESTUDIANTE || item.NombreEstudiante || '',
          codigo: item.codigo || item.CODIGO || item.CodEstudiante || '',
          programa: item.programa || item.PROGRAMA || '',
          nivel: item.nivel || item.NIVEL || '',
          periodoIngreso: item.peringreso || item.PERINGRESO || item.PeriodoIngreso || '',
          estadoMatricula: item.estadomatricula || item.ESTADOMATRICULA || item.EstadoMatricula || '',
          estadoEstudiante: item.estadoEstudiante || item.EstadoEstudiante || item.ESTADOESTUDIANTE || '',
          periodoSiguiente: periodoSiguienteRef,
          tipodocumento: item.tipodocumento || item.TIPODOCUMENTO || '',
          documento: item.documento || item.DOCUMENTO || '',
          telefonoppal: item.telefonoppal || item.TELEFONOPPAL || '',
          celular: item.celular || item.CELULAR || '',
          correounac: item.correounac || item.CORREOUNAC || '',
          correootro: item.correootro || item.CORREOOTRO || '',
          muniprocedencia: item.muniprocedencia || item.MUNIPROCEDENCIA || '',
          dptoprocedencia: item.dptoprocedencia || item.DPTOPROCEDENCIA || '',
          paisprocedencia: item.paisprocedencia || item.PAISPROCEDENCIA || ''
        }));
        setListaMatriculados(normalizados);
        setLoadingMatriculados(false);
      })
      .catch(error => {
        console.error('Error al obtener los matriculados:', error);
        setListaMatriculados([]);
        setLoadingMatriculados(false);
      });
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError(null);
    axios.post(buildApiUrl('/apiDesercion/usuarios/login'), loginData)
      .then(res => {
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        setIsAuthenticated(true);
        setCurrentUser(loginData.username);
        localStorage.setItem('currentUser', loginData.username);
        const rol = res.data.rol || 'usuario';
        setUserRol(rol);
        localStorage.setItem('userRol', rol);
      })
      .catch(err => {
        setLoginError('Usuario o contraseña incorrectos');
      });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken('');
    setMatriculas([]);
    setPeriodos([]);
    setPeriodoSeleccionado('');
    setVista('matriculas');
    setCurrentUser('');
    setUserRol('usuario');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRol');
  };

  const handleConfigCambiarPassword = (e) => {
    e.preventDefault();
    setConfigMsg('');
    setConfigError('');
    axios.post(buildApiUrl('/apiDesercion/usuarios/cambiar-password'), { passwordActual: configPasswordActual, passwordNueva: configPasswordNueva }, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        setConfigMsg('Contraseña actualizada correctamente.');
        setConfigPasswordActual('');
        setConfigPasswordNueva('');
      })
      .catch(err => setConfigError(err.response?.data?.error || 'Error al cambiar contraseña'));
  };

  const fetchConfigUsuarios = () => {
    setLoadingUsuarios(true);
    axios.get(buildApiUrl('/apiDesercion/usuarios'), { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setListaUsuarios(res.data); setLoadingUsuarios(false); })
      .catch(err => { setLoadingUsuarios(false); });
  };

  const handleConfigAbrirModalUsuario = (usuario) => {
    setConfigUsuarioModal(usuario === null ? 'create' : usuario);
    setConfigUsuarioForm(usuario ? { username: usuario.username, password: '', rol: usuario.rol || 'usuario' } : { username: '', password: '', rol: 'usuario' });
  };

  const handleConfigCerrarModalUsuario = () => {
    setConfigUsuarioModal(null);
    setConfigUsuarioForm({ username: '', password: '', rol: 'usuario' });
    setConfigError('');
  };

  const handleConfigGuardarUsuario = (e) => {
    e.preventDefault();
    if (!configUsuarioForm.username.trim()) return;
    const esCrear = !configUsuarioModal || configUsuarioModal === 'create';
    if (esCrear) {
      axios.post(buildApiUrl('/apiDesercion/usuarios/register'), { username: configUsuarioForm.username.trim(), password: configUsuarioForm.password || 'temp123', rol: configUsuarioForm.rol }, { headers: { Authorization: `Bearer ${token}` } })
        .then(() => { fetchConfigUsuarios(); handleConfigCerrarModalUsuario(); })
        .catch(err => setConfigError(err.response?.data?.error || 'Error al crear usuario'));
    } else {
      const body = { username: configUsuarioForm.username.trim(), rol: configUsuarioForm.rol };
      if (configUsuarioForm.password && configUsuarioForm.password.trim()) body.password = configUsuarioForm.password.trim();
      axios.put(buildApiUrl(`/apiDesercion/usuarios/${configUsuarioModal.id}`), body, { headers: { Authorization: `Bearer ${token}` } })
        .then(() => { fetchConfigUsuarios(); handleConfigCerrarModalUsuario(); })
        .catch(err => setConfigError(err.response?.data?.error || 'Error al actualizar usuario'));
    }
  };

  const handleConfigEliminarUsuario = (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    axios.delete(buildApiUrl(`/apiDesercion/usuarios/${id}`), { headers: { Authorization: `Bearer ${token}` } })
      .then(() => fetchConfigUsuarios())
      .catch(err => alert(err.response?.data?.error || 'Error al eliminar'));
  };

  const Sidebar = () => {
    // Restaurar posición del scroll después del render
    React.useEffect(() => {
      if (sidebarScrollRef.current) {
        sidebarScrollRef.current.scrollTop = sidebarScrollPosition.current;
      }
    });

    return (
      <div style={{
        width: 200,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
        background: '#222',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Parte superior con scroll - solo los botones de menú */}
        <div 
          ref={sidebarScrollRef}
          onScroll={(e) => {
            sidebarScrollPosition.current = e.target.scrollTop;
          }}
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: 10,
          }}>
        {/* Sección Tablas */}
        <div>
          <button 
            onClick={() => setTablasExpandida(!tablasExpandida)}
            style={{
              ...sidebarBtnStyle,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 'bold',
              backgroundColor: tablasExpandida ? '#333' : '#222',
            }}
          >
            <span>Tablas</span>
            <span style={{ fontSize: '12px' }}>{tablasExpandida ? '▼' : '▶'}</span>
          </button>
          {tablasExpandida && (
            <>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('matriculas'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Matrículas</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('desercion'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Deserción</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('primiparos'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Primíparos</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('graduados'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Graduados</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('ausencia-intersemestral'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Ausencia intersemestral</button>
            </>
          )}
        </div>

        {/* Sección Gráficos */}
        <div>
          <button
            onClick={() => setGraficosExpandida(!graficosExpandida)}
            style={{
              ...sidebarBtnStyle,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 'bold',
              backgroundColor: graficosExpandida ? '#333' : '#222',
            }}
          >
            <span>Gráficos</span>
            <span style={{ fontSize: '12px' }}>{graficosExpandida ? '▼' : '▶'}</span>
          </button>
          {graficosExpandida && (
            <>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setGraficoSeccion('matriculas'); setVista('graficos'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Matrículas</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setGraficoSeccion('desercion'); setVista('graficos'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Deserción</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setGraficoSeccion('primiparos'); setVista('graficos'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Primíparos</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setGraficoSeccion('graduados'); setVista('graficos'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Graduados</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setGraficoSeccion('ausencia-intersemestral'); setVista('graficos'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Ausencia intersemestral</button>
            </>
          )}
        </div>

        {/* Sección Tasas */}
        <div>
          <button 
            onClick={() => setTasasExpandida(!tasasExpandida)}
            style={{
              ...sidebarBtnStyle,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 'bold',
              backgroundColor: tasasExpandida ? '#333' : '#222',
            }}
          >
            <span>Tasas</span>
            <span style={{ fontSize: '12px' }}>{tasasExpandida ? '▼' : '▶'}</span>
          </button>
          {tasasExpandida && (
            <>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('tasa-desercion'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de deserción anual</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('tasa-desercion-cohorte'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de deserción por cohorte</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('tasa-desercion-promedio'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de deserción promedio acumulada</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('tasa-graduacion'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de graduación acumulada</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('tasa-ausencia-intersemestral'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de ausencia intersemestral</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('tasa-supervivencia'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de supervivencia</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('tasa-desercion-periodo-2-8'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa deserción periodo 2.8</button>
            </>
          )}
        </div>

        {/* Sección Gráficos Tasas */}
        <div>
          <button
            onClick={() => setGraficosTasasExpandida(!graficosTasasExpandida)}
            style={{
              ...sidebarBtnStyle,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 'bold',
              backgroundColor: graficosTasasExpandida ? '#333' : '#222',
            }}
          >
            <span>Gráficos Tasas</span>
            <span style={{ fontSize: '12px' }}>{graficosTasasExpandida ? '▼' : '▶'}</span>
          </button>
          {graficosTasasExpandida && (
            <>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('graficos-tasa-desercion'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de deserción anual</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('graficos-tasa-desercion-cohorte'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de deserción por cohorte</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('graficos-tasa-desercion-promedio'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de deserción promedio acumulada</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('graficos-tasa-graduacion'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de graduación acumulada</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('graficos-tasa-ausencia-intersemestral'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de ausencia intersemestral</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('graficos-tasa-supervivencia'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa de supervivencia</button>
              <button onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('graficos-tasa-desercion-periodo-2-8'); }} style={{...sidebarBtnStyle, paddingLeft: '35px'}}>Tasa deserción periodo 2.8</button>
            </>
          )}
        </div>

        <button
          onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('riesgo-desercion'); }}
          style={sidebarBtnStyle}
        >
          Riesgo de deserción (ML)
        </button>

        <button
          onClick={(e) => { e.preventDefault(); sidebarScrollPosition.current = sidebarScrollRef.current?.scrollTop || 0; setVista('manual-usuario'); }}
          style={{...sidebarBtnStyle, marginTop: 10}}
        >
          📖 Manual de usuario
        </button>
      </div>
      
      {/* Parte fija inferior - Modo oscuro, Con Cancelados y logout */}
      <div style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '15px 20px',
          borderTop: '1px solid #444',
          borderBottom: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: '#222',
        }}>
          <span style={{ fontSize: 16, color: '#fff' }}>Modo oscuro</span>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: 50,
            height: 26
          }}>
            <input
              type="checkbox"
              checked={modoOscuro}
              onChange={(e) => setModoOscuro(e.target.checked)}
              style={{
                opacity: 0,
                width: 0,
                height: 0
              }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: modoOscuro ? '#4CAF50' : '#ccc',
              transition: '0.4s',
              borderRadius: 26,
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: 20,
                width: 20,
                left: 3,
                bottom: 3,
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%',
                transform: modoOscuro ? 'translateX(24px)' : 'translateX(0)'
              }}></span>
            </span>
          </label>
        </div>
        <div style={{
          padding: '15px 20px',
          borderTop: '1px solid #444',
          borderBottom: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: '#222',
        }}>
          <span style={{ fontSize: 16, color: '#fff' }}>Con Cancelados</span>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: 50,
            height: 26
          }}>
            <input
              type="checkbox"
              checked={conCancelados}
              onChange={(e) => handleToggleConCancelados(e.target.checked)}
              style={{
                opacity: 0,
                width: 0,
                height: 0
              }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: conCancelados ? '#4CAF50' : '#ccc',
              transition: '0.4s',
              borderRadius: 26,
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: 20,
                width: 20,
                left: 3,
                bottom: 3,
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%',
                transform: conCancelados ? 'translateX(24px)' : 'translateX(0)'
              }}></span>
            </span>
          </label>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10, paddingTop: 10}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
            {currentUser && <span style={{fontSize: 13, color: '#fff', wordBreak: 'break-word', textAlign: 'center'}}>{currentUser}</span>}
            <button
              onClick={(e) => { e.preventDefault(); setVista('configuracion'); }}
              title="Configuración"
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 4,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
              }}
            >
              ⚙️
            </button>
          </div>
          <button onClick={handleLogout} style={{
            ...sidebarBtnStyle,
            background: '#a00',
            marginBottom: 20,
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 13,
            padding: '10px 5px',
            border: '2px solid #fff',
            maxWidth: 120,
            width: '100%',
            borderRadius: 6,
            letterSpacing: 1,
            textAlign: 'center',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: 1.1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 32,
            alignSelf: 'center',
          }}>Cerrar sesión</button>
        </div>
      </div>
    </div>
    );
  };

  const sidebarBtnStyle = {
    background: 'none',
    border: 'none',
    color: '#fff',
    padding: '15px 20px',
    textAlign: 'left',
    fontSize: 16,
    cursor: 'pointer',
    outline: 'none',
    width: '100%',
    transition: 'background 0.2s',
  };

  // 4. Handlers de clic para cada gráfico
  const handleBarPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoGraficoSeleccionado(periodoGraficoSeleccionado === periodo ? null : periodo);
  };

  // 4. Handlers de clic para cada gráfico
  const handleBarFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadGraficoSeleccionada === facultad ? null : facultad;
    setFacultadGraficoSeleccionada(nuevaFacultad);
    // Al cambiar facultad, limpiar programa para filtrar por la nueva selección
    setProgramaGraficoSeleccionado(null);
  };

  // 4. Handlers de clic para cada gráfico
  const handleBarNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelGraficoSeleccionado(nivelGraficoSeleccionado === nivel ? null : nivel);
  };

  // 4. Handler para clic en barra de programa
  const handleBarProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaGraficoSeleccionado(programaGraficoSeleccionado === programa ? null : programa);
  };

  const handleBarDesercionPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoGraficoDesercionSeleccionado(periodoGraficoDesercionSeleccionado === periodo ? null : periodo);
  };

  const handleBarDesercionFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadGraficoDesercionSeleccionada === facultad ? null : facultad;
    setFacultadGraficoDesercionSeleccionada(nuevaFacultad);
    setProgramaGraficoDesercionSeleccionado(null);
  };

  const handleBarDesercionProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaGraficoDesercionSeleccionado(programaGraficoDesercionSeleccionado === programa ? null : programa);
  };

  const handleBarDesercionNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelGraficoDesercionSeleccionado(nivelGraficoDesercionSeleccionado === nivel ? null : nivel);
  };

  const handleBarPrimiparosPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoGraficoPrimiparosSeleccionado(periodoGraficoPrimiparosSeleccionado === periodo ? null : periodo);
  };

  const handleBarPrimiparosFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadGraficoPrimiparosSeleccionada === facultad ? null : facultad;
    setFacultadGraficoPrimiparosSeleccionada(nuevaFacultad);
    setProgramaGraficoPrimiparosSeleccionado(null);
  };

  const handleBarPrimiparosProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaGraficoPrimiparosSeleccionado(programaGraficoPrimiparosSeleccionado === programa ? null : programa);
  };

  const handleBarPrimiparosNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelGraficoPrimiparosSeleccionado(nivelGraficoPrimiparosSeleccionado === nivel ? null : nivel);
  };

  const handleBarGraduadosPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoGraficoGraduadosSeleccionado(periodoGraficoGraduadosSeleccionado === periodo ? null : periodo);
  };

  const handleBarGraduadosFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadGraficoGraduadosSeleccionada === facultad ? null : facultad;
    setFacultadGraficoGraduadosSeleccionada(nuevaFacultad);
    setProgramaGraficoGraduadosSeleccionado(null);
  };

  const handleBarGraduadosProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaGraficoGraduadosSeleccionado(programaGraficoGraduadosSeleccionado === programa ? null : programa);
  };

  const handleBarGraduadosNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelGraficoGraduadosSeleccionado(nivelGraficoGraduadosSeleccionado === nivel ? null : nivel);
  };

  const handleBarAusenciaPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoGraficoAusenciaSeleccionado(periodoGraficoAusenciaSeleccionado === periodo ? null : periodo);
  };

  const handleBarAusenciaFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadGraficoAusenciaSeleccionada === facultad ? null : facultad;
    setFacultadGraficoAusenciaSeleccionada(nuevaFacultad);
    setProgramaGraficoAusenciaSeleccionado(null);
  };

  const handleBarAusenciaProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaGraficoAusenciaSeleccionado(programaGraficoAusenciaSeleccionado === programa ? null : programa);
  };

  const handleBarAusenciaNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelGraficoAusenciaSeleccionado(nivelGraficoAusenciaSeleccionado === nivel ? null : nivel);
  };

  const handleBarTasaDesercionPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos-tasa-desercion') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoTasaDesercionGraficoSeleccionado(
      periodoTasaDesercionGraficoSeleccionado === periodo ? null : periodo
    );
  };

  const handleBarTasaDesercionFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos-tasa-desercion') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadTasaDesercionGraficoSeleccionada === facultad ? null : facultad;
    setFacultadTasaDesercionGraficoSeleccionada(nuevaFacultad);
    setProgramaTasaDesercionGraficoSeleccionado(null);
  };

  const handleBarTasaDesercionProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos-tasa-desercion') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaTasaDesercionGraficoSeleccionado(
      programaTasaDesercionGraficoSeleccionado === programa ? null : programa
    );
  };

  const handleBarTasaDesercionNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos-tasa-desercion') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelTasaDesercionGraficoSeleccionado(
      nivelTasaDesercionGraficoSeleccionado === nivel ? null : nivel
    );
  };

  const handleBarTasaDesercionCohortePeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-cohorte') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoTasaDesercionCohorteGraficoSeleccionado(
      periodoTasaDesercionCohorteGraficoSeleccionado === periodo ? null : periodo
    );
  };

  const handleBarTasaDesercionCohorteFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-cohorte') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadTasaDesercionCohorteGraficoSeleccionada === facultad ? null : facultad;
    setFacultadTasaDesercionCohorteGraficoSeleccionada(nuevaFacultad);
    setProgramaTasaDesercionCohorteGraficoSeleccionado(null);
  };

  const handleBarTasaDesercionCohorteProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-cohorte') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaTasaDesercionCohorteGraficoSeleccionado(
      programaTasaDesercionCohorteGraficoSeleccionado === programa ? null : programa
    );
  };

  const handleBarTasaDesercionCohorteNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-cohorte') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelTasaDesercionCohorteGraficoSeleccionado(
      nivelTasaDesercionCohorteGraficoSeleccionado === nivel ? null : nivel
    );
  };

  const handleBarTasaDesercionPromedioPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-promedio') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoTasaDesercionPromedioGraficoSeleccionado(
      periodoTasaDesercionPromedioGraficoSeleccionado === periodo ? null : periodo
    );
  };

  const handleBarTasaDesercionPromedioFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-promedio') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadTasaDesercionPromedioGraficoSeleccionada === facultad ? null : facultad;
    setFacultadTasaDesercionPromedioGraficoSeleccionada(nuevaFacultad);
    setProgramaTasaDesercionPromedioGraficoSeleccionado(null);
  };

  const handleBarTasaDesercionPromedioProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-promedio') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaTasaDesercionPromedioGraficoSeleccionado(
      programaTasaDesercionPromedioGraficoSeleccionado === programa ? null : programa
    );
  };

  const handleBarTasaDesercionPromedioNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-promedio') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelTasaDesercionPromedioGraficoSeleccionado(
      nivelTasaDesercionPromedioGraficoSeleccionado === nivel ? null : nivel
    );
  };

  const handleBarTasaGraduacionPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos-tasa-graduacion') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoTasaGraduacionGraficoSeleccionado(
      periodoTasaGraduacionGraficoSeleccionado === periodo ? null : periodo
    );
  };

  const handleBarTasaGraduacionFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos-tasa-graduacion') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadTasaGraduacionGraficoSeleccionada === facultad ? null : facultad;
    setFacultadTasaGraduacionGraficoSeleccionada(nuevaFacultad);
    setProgramaTasaGraduacionGraficoSeleccionado(null);
  };

  const handleBarTasaGraduacionProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos-tasa-graduacion') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaTasaGraduacionGraficoSeleccionado(
      programaTasaGraduacionGraficoSeleccionado === programa ? null : programa
    );
  };

  const handleBarTasaGraduacionNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos-tasa-graduacion') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelTasaGraduacionGraficoSeleccionado(
      nivelTasaGraduacionGraficoSeleccionado === nivel ? null : nivel
    );
  };

  const handleBarTasaAusenciaPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos-tasa-ausencia-intersemestral') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoTasaAusenciaGraficoSeleccionado(
      periodoTasaAusenciaGraficoSeleccionado === periodo ? null : periodo
    );
  };

  const handleBarTasaAusenciaFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos-tasa-ausencia-intersemestral') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadTasaAusenciaGraficoSeleccionada === facultad ? null : facultad;
    setFacultadTasaAusenciaGraficoSeleccionada(nuevaFacultad);
    setProgramaTasaAusenciaGraficoSeleccionado(null);
  };

  const handleBarTasaAusenciaProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos-tasa-ausencia-intersemestral') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaTasaAusenciaGraficoSeleccionado(
      programaTasaAusenciaGraficoSeleccionado === programa ? null : programa
    );
  };

  const handleBarTasaAusenciaNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos-tasa-ausencia-intersemestral') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelTasaAusenciaGraficoSeleccionado(
      nivelTasaAusenciaGraficoSeleccionado === nivel ? null : nivel
    );
  };

  const handleBarTasaSupervivenciaPeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos-tasa-supervivencia') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoTasaSupervivenciaGraficoSeleccionado(
      periodoTasaSupervivenciaGraficoSeleccionado === periodo ? null : periodo
    );
  };

  const handleBarTasaSupervivenciaFacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos-tasa-supervivencia') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadTasaSupervivenciaGraficoSeleccionada === facultad ? null : facultad;
    setFacultadTasaSupervivenciaGraficoSeleccionada(nuevaFacultad);
    setProgramaTasaSupervivenciaGraficoSeleccionado(null);
  };

  const handleBarTasaSupervivenciaProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos-tasa-supervivencia') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaTasaSupervivenciaGraficoSeleccionado(
      programaTasaSupervivenciaGraficoSeleccionado === programa ? null : programa
    );
  };

  const handleBarTasaSupervivenciaNivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos-tasa-supervivencia') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelTasaSupervivenciaGraficoSeleccionado(
      nivelTasaSupervivenciaGraficoSeleccionado === nivel ? null : nivel
    );
  };

  const handleBarTasaDesercion28PeriodoClick = (data) => {
    if (!data || !data.activeLabel) return;
    const periodo = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-periodo-2-8') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setPeriodoTasaDesercion28GraficoSeleccionado(
      periodoTasaDesercion28GraficoSeleccionado === periodo ? null : periodo
    );
  };

  const handleBarTasaDesercion28FacultadClick = (data) => {
    if (!data || !data.activeLabel) return;
    const facultad = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-periodo-2-8') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    const nuevaFacultad = facultadTasaDesercion28GraficoSeleccionada === facultad ? null : facultad;
    setFacultadTasaDesercion28GraficoSeleccionada(nuevaFacultad);
    setProgramaTasaDesercion28GraficoSeleccionado(null);
  };

  const handleBarTasaDesercion28ProgramaClick = (data) => {
    if (!data || !data.activeLabel) return;
    const programa = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-periodo-2-8') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setProgramaTasaDesercion28GraficoSeleccionado(
      programaTasaDesercion28GraficoSeleccionado === programa ? null : programa
    );
  };

  const handleBarTasaDesercion28NivelClick = (data) => {
    if (!data || !data.activeLabel) return;
    const nivel = data.activeLabel;
    if (vista === 'graficos-tasa-desercion-periodo-2-8') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setNivelTasaDesercion28GraficoSeleccionado(
      nivelTasaDesercion28GraficoSeleccionado === nivel ? null : nivel
    );
  };

  const [mostrarModalTasaDesercionGrafico, setMostrarModalTasaDesercionGrafico] = useState(false);
  const [tasaDesercionGraficoModalContext, setTasaDesercionGraficoModalContext] = useState({
    periodo: null,
    programa: '',
    facultad: '',
    nivel: ''
  });
  const [mostrarModalTasaDesercionCohorteGrafico, setMostrarModalTasaDesercionCohorteGrafico] = useState(false);
  const [tasaDesercionCohorteGraficoModalContext, setTasaDesercionCohorteGraficoModalContext] = useState({
    cohorte: null,
    programa: '',
    facultad: '',
    nivel: '',
    semestre: '',
    tasa: null,
    primiparos: null,
    desertores: null
  });
  const [mostrarModalTasaDesercionPromedioGrafico, setMostrarModalTasaDesercionPromedioGrafico] = useState(false);
  const [tasaDesercionPromedioGraficoModalContext, setTasaDesercionPromedioGraficoModalContext] = useState({
    periodo: null,
    programa: '',
    facultad: '',
    nivel: '',
    tasa: null,
    primiparos: null,
    desertores: null
  });
  const [mostrarModalTasaGraduacionGrafico, setMostrarModalTasaGraduacionGrafico] = useState(false);
  const [tasaGraduacionGraficoModalContext, setTasaGraduacionGraficoModalContext] = useState({
    periodo: null,
    programa: '',
    facultad: '',
    nivel: '',
    tasa: null,
    primiparos: null,
    graduados: null
  });
  const [mostrarModalTasaAusenciaGrafico, setMostrarModalTasaAusenciaGrafico] = useState(false);
  const [tasaAusenciaGraficoModalContext, setTasaAusenciaGraficoModalContext] = useState({
    periodo: null,
    programa: '',
    facultad: '',
    nivel: '',
    tasa: null,
    matriculados: null,
    ausencias: null
  });
  const [mostrarModalTasaSupervivenciaGrafico, setMostrarModalTasaSupervivenciaGrafico] = useState(false);
  const [tasaSupervivenciaGraficoModalContext, setTasaSupervivenciaGraficoModalContext] = useState({
    periodo: null,
    programa: '',
    facultad: '',
    nivel: '',
    tasa: null,
    primiparos: null,
    matriculados: null
  });
  const [mostrarModalTasaDesercion28Grafico, setMostrarModalTasaDesercion28Grafico] = useState(false);
  const [tasaDesercion28GraficoModalContext, setTasaDesercion28GraficoModalContext] = useState({
    periodo: null,
    programa: '',
    facultad: '',
    nivel: '',
    tasa: null,
    matriculados: null,
    desertores: null
  });

  const abrirModalTasaDesercionGrafico = () => {
    const periodoActual = periodoTasaDesercionGraficoSeleccionado
      || (tasaDesercionPeriodoGrafico.length > 0
        ? tasaDesercionPeriodoGrafico[tasaDesercionPeriodoGrafico.length - 1].periodo
        : '');
    if (!periodoActual) return;
    const programaActual = programaTasaDesercionGraficoSeleccionado || '';
    const facultadActual = facultadTasaDesercionGraficoSeleccionada || '';
    const nivelActual = nivelTasaDesercionGraficoSeleccionado || '';
    setTasaDesercionGraficoModalContext({
      periodo: periodoActual,
      programa: programaActual,
      facultad: facultadActual,
      nivel: nivelActual
    });
    setMostrarModalTasaDesercionGrafico(true);
    calcularTasaDesercion(token, periodoActual, programaActual, facultadActual, nivelActual);
  };

  const abrirModalTasaDesercionCohorteGrafico = (overrides = {}, payloadData = null) => {
    const cohorteActual = overrides.cohorte
      || periodoTasaDesercionCohorteGraficoSeleccionado
      || (tasaDesercionCohortePeriodoGrafico.length > 0
        ? tasaDesercionCohortePeriodoGrafico[tasaDesercionCohortePeriodoGrafico.length - 1].periodo
        : '');
    if (!cohorteActual) return;
    const programaActual = overrides.programa ?? (programaTasaDesercionCohorteGraficoSeleccionado || '');
    const facultadActual = overrides.facultad ?? (facultadTasaDesercionCohorteGraficoSeleccionada || '');
    const nivelActual = overrides.nivel ?? (nivelTasaDesercionCohorteGraficoSeleccionado || '');
    const semestreActual = overrides.semestre ?? '';
    setTasaDesercionCohorteGraficoModalContext({
      cohorte: cohorteActual,
      programa: programaActual,
      facultad: facultadActual,
      nivel: nivelActual,
      semestre: semestreActual,
      tasa: payloadData?.tasa ?? null,
      primiparos: payloadData?.primiparos ?? null,
      desertores: payloadData?.desertores ?? null
    });
    setMostrarModalTasaDesercionCohorteGrafico(true);
    calcularTasaDesercionCohorte(token, cohorteActual, programaActual, semestreActual, facultadActual, nivelActual);
  };

  const abrirModalTasaDesercionPromedioGrafico = (overrides = {}, payloadData = null) => {
    const periodoActual = overrides.periodo
      || periodoTasaDesercionPromedioGraficoSeleccionado
      || periodoBaseTasaDesercionPromedio
      || '';
    if (!periodoActual) return;
    const programaActual = overrides.programa ?? (programaTasaDesercionPromedioGraficoSeleccionado || '');
    const facultadActual = overrides.facultad ?? (facultadTasaDesercionPromedioGraficoSeleccionada || '');
    const nivelActual = overrides.nivel ?? (nivelTasaDesercionPromedioGraficoSeleccionado || '');
    setTasaDesercionPromedioGraficoModalContext({
      periodo: periodoActual,
      programa: programaActual,
      facultad: facultadActual,
      nivel: nivelActual,
      tasa: null,
      primiparos: null,
      desertores: null
    });
    setMostrarModalTasaDesercionPromedioGrafico(true);
    calcularTasaDesercionPromedio(token, periodoActual, programaActual, facultadActual, nivelActual);
  };

  const abrirModalTasaGraduacionGrafico = (overrides = {}, payloadData = null) => {
    const periodoActual = overrides.periodo || periodoTasaGraduacionGraficoSeleccionado || periodoBaseTasaGraduacion || '';
    if (!periodoActual) return;
    const programaActual = overrides.programa ?? (programaTasaGraduacionGraficoSeleccionado || '');
    const facultadActual = overrides.facultad ?? (facultadTasaGraduacionGraficoSeleccionada || '');
    const nivelActual = overrides.nivel ?? (nivelTasaGraduacionGraficoSeleccionado || '');
    setTasaGraduacionGraficoModalContext({
      periodo: periodoActual,
      programa: programaActual,
      facultad: facultadActual,
      nivel: nivelActual,
      tasa: payloadData?.tasa ?? null,
      primiparos: payloadData?.primiparos ?? null,
      graduados: payloadData?.graduados ?? null
    });
    setMostrarModalTasaGraduacionGrafico(true);
    calcularTasaGraduacion(token, periodoActual, programaActual, facultadActual, nivelActual);
  };

  const abrirModalTasaAusenciaGrafico = (overrides = {}, payloadData = null) => {
    const periodoActual = overrides.periodo || periodoTasaAusenciaGraficoSeleccionado || periodoBaseTasaAusencia || '';
    if (!periodoActual) return;
    const programaActual = overrides.programa ?? (programaTasaAusenciaGraficoSeleccionado || '');
    const facultadActual = overrides.facultad ?? (facultadTasaAusenciaGraficoSeleccionada || '');
    const nivelActual = overrides.nivel ?? (nivelTasaAusenciaGraficoSeleccionado || '');
    setTasaAusenciaGraficoModalContext({
      periodo: periodoActual,
      programa: programaActual,
      facultad: facultadActual,
      nivel: nivelActual,
      tasa: payloadData?.tasa ?? null,
      matriculados: payloadData?.matriculados ?? null,
      ausencias: payloadData?.ausencias ?? null
    });
    setMostrarModalTasaAusenciaGrafico(true);
    calcularTasaAusenciaIntersemestral(token, periodoActual, programaActual, facultadActual, nivelActual);
  };

  const abrirModalTasaSupervivenciaGrafico = (overrides = {}, payloadData = null) => {
    const periodoActual = overrides.periodo || periodoTasaSupervivenciaGraficoSeleccionado || periodoBaseTasaSupervivencia || '';
    if (!periodoActual) return;
    const programaActual = overrides.programa ?? (programaTasaSupervivenciaGraficoSeleccionado || '');
    const facultadActual = overrides.facultad ?? (facultadTasaSupervivenciaGraficoSeleccionada || '');
    const nivelActual = overrides.nivel ?? (nivelTasaSupervivenciaGraficoSeleccionado || '');
    setTasaSupervivenciaGraficoModalContext({
      periodo: periodoActual,
      programa: programaActual,
      facultad: facultadActual,
      nivel: nivelActual,
      tasa: payloadData?.tasa ?? null,
      primiparos: payloadData?.primiparos ?? null,
      matriculados: payloadData?.matriculados ?? null
    });
    setMostrarModalTasaSupervivenciaGrafico(true);
    calcularTasaSupervivencia(token, periodoActual, programaActual, facultadActual, nivelActual);
  };

  const abrirModalTasaDesercion28Grafico = (overrides = {}, payloadData = null) => {
    const periodoActual = overrides.periodo || periodoTasaDesercion28GraficoSeleccionado || periodoBaseTasaDesercion28 || '';
    if (!periodoActual) return;
    const programaActual = overrides.programa ?? (programaTasaDesercion28GraficoSeleccionado || '');
    const facultadActual = overrides.facultad ?? (facultadTasaDesercion28GraficoSeleccionada || '');
    const nivelActual = overrides.nivel ?? (nivelTasaDesercion28GraficoSeleccionado || '');
    setTasaDesercion28GraficoModalContext({
      periodo: periodoActual,
      programa: programaActual,
      facultad: facultadActual,
      nivel: nivelActual,
      tasa: payloadData?.tasa ?? null,
      matriculados: payloadData?.matriculados ?? null,
      desertores: payloadData?.desertores ?? null
    });
    setMostrarModalTasaDesercion28Grafico(true);
    calcularTasaDesercion28(token, periodoActual, programaActual, facultadActual, nivelActual);
  };

  const renderTasaDesercionCalculo = ({ periodoActual, programaActual, onActualizar }) => (
    <div style={{
      marginTop: '30px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      border: '2px solid #6c757d',
      borderRadius: '10px'
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3 style={{margin: '0', color: '#495057'}}>
          Cálculo de Tasa de Deserción Anual (TDA)
        </h3>
        <button
          onClick={onActualizar}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Actualizar
        </button>
      </div>
      
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#495057',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '5px'
        }}>
          <span>TDA<sub>t</sub> = (</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '20px'
          }}>
            <span>Desertores de t / Matriculados en t - 2</span>
          </div>
          <span>) * 100</span>
        </div>
        <div style={{fontSize: '14px', color: '#6c757d', marginTop: '10px'}}>
          Donde t es el período
        </div>
      </div>

      {loadingCalculoTasa ? (
        <div style={{textAlign: 'center', padding: '20px'}}>
          <p>Cargando datos para el cálculo...</p>
        </div>
      ) : errorCalculoTasa ? (
        <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}>
          <p>Error al calcular la tasa de deserción: {errorCalculoTasa}</p>
        </div>
      ) : datosTasaDesercion ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          <div style={{
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Desertores</h4>
            <div 
              style={{
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: '#dc3545',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '10px',
                borderRadius: '4px'
              }}
              onClick={handleClickDesertores}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f8d7da';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.transform = 'scale(1)';
              }}
              title="Hacer clic para ver la lista de desertores"
            >
              {datosTasaDesercion.desertores}
            </div>
            <div style={{fontSize: '14px', color: '#6c757d'}}>
              Período {datosTasaDesercion.periodo}
            </div>
            <div style={{fontSize: '12px', color: '#dc3545', marginTop: '5px'}}>
              (Hacer clic para ver detalles)
            </div>
          </div>
          <div style={{
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Matriculados</h4>
            <div 
              style={{
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: '#007bff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '10px',
                borderRadius: '4px'
              }}
              onClick={handleClickMatriculados}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e3f2fd';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.transform = 'scale(1)';
              }}
              title="Hacer clic para ver la lista de matriculados"
            >
              {datosTasaDesercion.matriculados}
            </div>
            <div style={{fontSize: '14px', color: '#6c757d'}}>
              Período {datosTasaDesercion.periodoConsulta}
            </div>
            <div style={{fontSize: '12px', color: '#007bff', marginTop: '5px'}}>
              (Hacer clic para ver detalles)
            </div>
          </div>
          <div style={{
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TDA</h4>
            <div style={{
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#28a745'
            }}>
              {datosTasaDesercion.tasa}%
            </div>
            <div style={{fontSize: '14px', color: '#6c757d'}}>
              {datosTasaDesercion.programa}
            </div>
          </div>
        </div>
      ) : !programaActual ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '8px',
          color: '#0c5460'
        }}>
          <p style={{margin: '0', fontSize: '16px', fontWeight: 'bold'}}>
            Calculando para TODOS los programas
          </p>
          <p style={{margin: '5px 0 0 0', fontSize: '14px'}}>
            Selecciona un programa específico para ver el cálculo individual
          </p>
        </div>
      ) : null}
    </div>
  );

  const renderTasaDesercionCohorteCalculo = ({ cohorteActual, programaActual, semestreActual, onActualizar }) => (
    <div style={{
      marginTop: '30px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      border: '2px solid #17a2b8',
      borderRadius: '8px'
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3 style={{margin: '0', color: '#495057'}}>
          Cálculo de Tasa de Deserción por Cohorte (TDC)
        </h3>
        <button
          onClick={onActualizar}
          style={{
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Actualizar
        </button>
      </div>
      
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#495057',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '5px'
        }}>
          <span>TDC<sub>c,s</sub> = (</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '20px'
          }}>
            <span>∑ Desertores<sub>c,s</sub> / Primíparos<sub>c</sub></span>
          </div>
          <span>) * 100</span>
        </div>
        <div style={{fontSize: '14px', color: '#6c757d', marginTop: '10px'}}>
          Donde c es la cohorte y s el semestre
        </div>
      </div>

      {loadingCalculoTasaCohorte ? (
        <div style={{textAlign: 'center', padding: '20px'}}>
          <p>Cargando datos para el cálculo...</p>
        </div>
      ) : errorCalculoTasaCohorte ? (
        <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}>
          <p>{errorCalculoTasaCohorte}</p>
        </div>
      ) : datosTasaDesercionCohorte || tasaDesercionCohorteGraficoModalContext.tasa !== null ? (
        (() => {
          const datosModal = (tasaDesercionCohorteGraficoModalContext.tasa !== null)
            ? {
                desertores: tasaDesercionCohorteGraficoModalContext.desertores ?? 0,
                primiparos: tasaDesercionCohorteGraficoModalContext.primiparos ?? 0,
                tasa: tasaDesercionCohorteGraficoModalContext.tasa ?? 0,
                cohorte: tasaDesercionCohorteGraficoModalContext.cohorte,
                programa: tasaDesercionCohorteGraficoModalContext.programa || 'Todos los programas'
              }
            : datosTasaDesercionCohorte;
          return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          <div style={{
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Desertores</h4>
            <div 
              style={{
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: '#dc3545',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '10px',
                borderRadius: '4px'
              }}
              onClick={handleClickDesertoresCohorte}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f8d7da';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.transform = 'scale(1)';
              }}
              title="Hacer clic para ver la lista de desertores"
            >
              {datosModal.desertores}
            </div>
            <div style={{fontSize: '14px', color: '#6c757d'}}>
              Cohorte {datosModal.cohorte}
            </div>
          </div>
          <div style={{
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#17a2b8'}}>Primíparos</h4>
            <div 
              style={{
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: '#17a2b8',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '10px',
                borderRadius: '4px'
              }}
              onClick={handleClickPrimiparosCohorte}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e3f2fd';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.transform = 'scale(1)';
              }}
              title="Hacer clic para ver la lista de primíparos"
            >
              {datosModal.primiparos}
            </div>
            <div style={{fontSize: '14px', color: '#6c757d'}}>
              Cohorte {datosModal.cohorte}
            </div>
          </div>
          <div style={{
            padding: '15px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TDC</h4>
            <div style={{
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#28a745'
            }}>
              {datosModal.tasa}%
            </div>
            <div style={{fontSize: '14px', color: '#6c757d'}}>
              {datosModal.programa}
            </div>
          </div>
        </div>
          );
        })()
      ) : (
        <div style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>
          <p>Seleccione una cohorte y programa para calcular la tasa de deserción por cohorte</p>
        </div>
      )}
    </div>
  );

  const renderTasaDesercionPromedioResumen = ({ periodoActual, programaActual, onActualizar }) => {
    const datosModal = (tasaDesercionPromedioGraficoModalContext.tasa !== null)
      ? {
          desertores: tasaDesercionPromedioGraficoModalContext.desertores ?? 0,
          primiparos: tasaDesercionPromedioGraficoModalContext.primiparos ?? 0,
          tasa: tasaDesercionPromedioGraficoModalContext.tasa ?? 0,
          periodo: tasaDesercionPromedioGraficoModalContext.periodo,
          programa: tasaDesercionPromedioGraficoModalContext.programa || 'Todos los programas'
        }
      : datosTasaDesercionPromedio;
    return (
      <div style={{marginTop: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h3 style={{margin: 0, color: '#495057'}}>Cálculo de TDPA</h3>
          <button onClick={onActualizar} style={{backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>
            Actualizar
          </button>
        </div>
        {loadingCalculoTasaPromedio ? (
          <div style={{textAlign: 'center', padding: '20px'}}><p>Cargando datos...</p></div>
        ) : errorCalculoTasaPromedio ? (
          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}><p>{errorCalculoTasaPromedio}</p></div>
        ) : datosModal ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px'}}>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Desertores</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#dc3545', cursor: 'pointer'}} onClick={handleClickDesertores}>
                {datosModal.desertores}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>Período {datosModal.periodo}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Primíparos</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#007bff', cursor: 'pointer'}} onClick={handleClickPrimiparosPromedio}>
                {datosModal.primiparos}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>{datosModal.programa}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TDPA</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#28a745'}}>
                {datosModal.tasa}%
              </div>
            </div>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>
            <p>No hay datos para mostrar.</p>
          </div>
        )}
      </div>
    );
  };

  const renderTasaGraduacionResumen = ({ periodoActual, programaActual, onActualizar }) => {
    const datosModal = (tasaGraduacionGraficoModalContext.tasa !== null)
      ? {
          graduados: tasaGraduacionGraficoModalContext.graduados ?? 0,
          primiparos: tasaGraduacionGraficoModalContext.primiparos ?? 0,
          tasa: tasaGraduacionGraficoModalContext.tasa ?? 0,
          periodo: tasaGraduacionGraficoModalContext.periodo,
          programa: tasaGraduacionGraficoModalContext.programa || 'Todos los programas'
        }
      : datosTasaGraduacion;
    return (
      <div style={{marginTop: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h3 style={{margin: 0, color: '#495057'}}>Cálculo de TGA</h3>
          <button onClick={onActualizar} style={{backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>
            Actualizar
          </button>
        </div>
        {loadingCalculoTasaGraduacion ? (
          <div style={{textAlign: 'center', padding: '20px'}}><p>Cargando datos...</p></div>
        ) : errorCalculoTasaGraduacion ? (
          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}><p>{errorCalculoTasaGraduacion}</p></div>
        ) : datosModal ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px'}}>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Graduados</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#dc3545', cursor: 'pointer'}} onClick={handleClickGraduados}>
                {datosModal.graduados}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>Período {datosModal.periodo}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Primíparos</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#007bff', cursor: 'pointer'}} onClick={handleClickPrimiparosGraduacion}>
                {datosModal.primiparos}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>{datosModal.programa}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TGA</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#28a745'}}>
                {datosModal.tasa}%
              </div>
            </div>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>
            <p>No hay datos para mostrar.</p>
          </div>
        )}
      </div>
    );
  };

  const renderTasaAusenciaResumen = ({ periodoActual, programaActual, onActualizar }) => {
    const datosModal = (tasaAusenciaGraficoModalContext.tasa !== null)
      ? {
          ausencias: tasaAusenciaGraficoModalContext.ausencias ?? 0,
          matriculados: tasaAusenciaGraficoModalContext.matriculados ?? 0,
          tasa: tasaAusenciaGraficoModalContext.tasa ?? 0,
          periodo: tasaAusenciaGraficoModalContext.periodo,
          programa: tasaAusenciaGraficoModalContext.programa || 'Todos los programas'
        }
      : datosTasaAusencia;
    return (
      <div style={{marginTop: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h3 style={{margin: 0, color: '#495057'}}>Cálculo de TAI</h3>
          <button onClick={onActualizar} style={{backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>
            Actualizar
          </button>
        </div>
        {loadingCalculoTasaAusencia ? (
          <div style={{textAlign: 'center', padding: '20px'}}><p>Cargando datos...</p></div>
        ) : errorCalculoTasaAusencia ? (
          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}><p>{errorCalculoTasaAusencia}</p></div>
        ) : datosModal ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px'}}>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Ausencias</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#dc3545', cursor: 'pointer'}} onClick={handleClickAusenciaIntersemestral}>
                {datosModal.ausencias}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>Período {datosModal.periodo}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Matriculados</h4>
              <div
                style={{fontSize: '32px', fontWeight: 'bold', color: '#007bff', cursor: 'pointer'}}
                onClick={handleClickMatriculadosAusencia}
              >
                {datosModal.matriculados}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>{datosModal.programa}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TAI</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#28a745'}}>
                {datosModal.tasa}%
              </div>
            </div>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>
            <p>No hay datos para mostrar.</p>
          </div>
        )}
      </div>
    );
  };

  const renderTasaSupervivenciaResumen = ({ periodoActual, programaActual, onActualizar }) => {
    const datosModal = (tasaSupervivenciaGraficoModalContext.tasa !== null)
      ? {
          matriculados: tasaSupervivenciaGraficoModalContext.matriculados ?? 0,
          primiparos: tasaSupervivenciaGraficoModalContext.primiparos ?? 0,
          tasa: tasaSupervivenciaGraficoModalContext.tasa ?? 0,
          periodo: tasaSupervivenciaGraficoModalContext.periodo,
          programa: tasaSupervivenciaGraficoModalContext.programa || 'Todos los programas'
        }
      : datosTasaSupervivencia;
    return (
      <div style={{marginTop: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h3 style={{margin: 0, color: '#495057'}}>Cálculo de TS</h3>
          <button onClick={onActualizar} style={{backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>
            Actualizar
          </button>
        </div>
        {loadingCalculoTasaSupervivencia ? (
          <div style={{textAlign: 'center', padding: '20px'}}><p>Cargando datos...</p></div>
        ) : errorCalculoTasaSupervivencia ? (
          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}><p>{errorCalculoTasaSupervivencia}</p></div>
        ) : datosModal ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px'}}>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Matriculados</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#dc3545', cursor: 'pointer'}} onClick={handleClickMatriculadosSupervivencia}>
                {datosModal.matriculados}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>Período {datosModal.periodo}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Primíparos</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#007bff', cursor: 'pointer'}} onClick={handleClickPrimiparosSupervivencia}>
                {datosModal.primiparos}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>{datosModal.programa}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TS</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#28a745'}}>
                {datosModal.tasa}%
              </div>
            </div>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>
            <p>No hay datos para mostrar.</p>
          </div>
        )}
      </div>
    );
  };

  const renderTasaDesercion28Resumen = ({ periodoActual, programaActual, onActualizar }) => {
    const datosModal = (tasaDesercion28GraficoModalContext.tasa !== null)
      ? {
          desertores: tasaDesercion28GraficoModalContext.desertores ?? 0,
          matriculados: tasaDesercion28GraficoModalContext.matriculados ?? 0,
          tasa: tasaDesercion28GraficoModalContext.tasa ?? 0,
          periodo: tasaDesercion28GraficoModalContext.periodo,
          programa: tasaDesercion28GraficoModalContext.programa || 'Todos los programas'
        }
      : datosTasaDesercion28;
    return (
      <div style={{marginTop: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h3 style={{margin: 0, color: '#495057'}}>Cálculo de Tasa 2.8</h3>
          <button onClick={onActualizar} style={{backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>
            Actualizar
          </button>
        </div>
        {loadingCalculoTasa28 ? (
          <div style={{textAlign: 'center', padding: '20px'}}><p>Cargando datos...</p></div>
        ) : errorCalculoTasa28 ? (
          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}><p>{errorCalculoTasa28}</p></div>
        ) : datosModal ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px'}}>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Desertores</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#dc3545', cursor: 'pointer'}} onClick={handleClickDesertores28}>
                {datosModal.desertores}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>Período {datosModal.periodo}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Matriculados</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#007bff', cursor: 'pointer'}} onClick={handleClickMatriculados28}>
                {datosModal.matriculados}
              </div>
              <div style={{fontSize: '14px', color: '#6c757d'}}>{datosModal.programa}</div>
            </div>
            <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>Tasa</h4>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#28a745'}}>
                {datosModal.tasa}%
              </div>
            </div>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>
            <p>No hay datos para mostrar.</p>
          </div>
        )}
      </div>
    );
  };

  const handleToggleConCancelados = (checked) => {
    if (vista === 'graficos') {
      graficosScrollRestore.current = window.scrollY;
      shouldRestoreGraficosScroll.current = true;
    }
    setConCancelados(checked);
  };

  const abrirModalMatriculasGraficos = () => {
    setMostrarModalMatriculasGraficos(true);
    setListaMatriculasGraficos([]);
    fetchMatriculasGraficos(
      token,
      periodoGraficoSeleccionado,
      programaGraficoSeleccionado,
      facultadGraficoSeleccionada,
      nivelGraficoSeleccionado
    );
  };

  const abrirModalDesercionGraficos = () => {
    setMostrarModalDesercionGraficos(true);
    setListaDesercionGraficos([]);
    fetchDesercionGraficos(
      token,
      periodoGraficoDesercionSeleccionado,
      programaGraficoDesercionSeleccionado,
      facultadGraficoDesercionSeleccionada,
      nivelGraficoDesercionSeleccionado
    );
  };

  const abrirModalPrimiparosGraficos = () => {
    setMostrarModalPrimiparosGraficos(true);
    setListaPrimiparosGraficos([]);
    fetchPrimiparosGraficos(
      token,
      periodoGraficoPrimiparosSeleccionado,
      programaGraficoPrimiparosSeleccionado,
      facultadGraficoPrimiparosSeleccionada,
      nivelGraficoPrimiparosSeleccionado
    );
  };

  const abrirModalGraduadosGraficos = () => {
    setMostrarModalGraduadosGraficos(true);
    setListaGraduadosGraficos([]);
    fetchGraduadosGraficos(
      token,
      periodoGraficoGraduadosSeleccionado,
      programaGraficoGraduadosSeleccionado,
      facultadGraficoGraduadosSeleccionada,
      nivelGraficoGraduadosSeleccionado
    );
  };

  const abrirModalAusenciaGraficos = () => {
    setMostrarModalAusenciaGraficos(true);
    setListaAusenciaGraficos([]);
    fetchAusenciaGraficos(
      token,
      periodoGraficoAusenciaSeleccionado,
      programaGraficoAusenciaSeleccionado,
      facultadGraficoAusenciaSeleccionada,
      nivelGraficoAusenciaSeleccionado
    );
  };

  const renderBarConVerDatos = (props, isSelected, baseFill, selectedFill, onVerDatos) => {
    const { x, y, width, height } = props;
    const fill = isSelected ? selectedFill : baseFill;
    if (!isSelected) {
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          rx={2}
        />
      );
    }
    const buttonWidth = 86;
    const buttonHeight = 24;
    const buttonX = x + width / 2 - buttonWidth / 2;
    // Dejar espacio para el valor y ubicar el botón por encima
    const buttonY = Math.max(0, y - buttonHeight - 26);
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          stroke="#d84315"
          strokeWidth={3}
          rx={6}
        />
        <foreignObject x={buttonX} y={buttonY} width={buttonWidth} height={buttonHeight}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onVerDatos();
            }}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 'bold'
            }}
          >
            Ver datos
          </button>
        </foreignObject>
      </g>
    );
  };

  useEffect(() => {
    if (
      (vista !== 'graficos' &&
        vista !== 'graficos-tasa-desercion' &&
        vista !== 'graficos-tasa-desercion-cohorte' &&
        vista !== 'graficos-tasa-desercion-promedio' &&
        vista !== 'graficos-tasa-graduacion' &&
        vista !== 'graficos-tasa-ausencia-intersemestral' &&
        vista !== 'graficos-tasa-supervivencia' &&
        vista !== 'graficos-tasa-desercion-periodo-2-8') ||
      !shouldRestoreGraficosScroll.current
    ) return;
    const scrollY = graficosScrollRestore.current ?? 0;
    shouldRestoreGraficosScroll.current = false;
    const timers = graficosScrollTimers.current;
    timers.forEach((id) => clearTimeout(id));
    timers.length = 0;
    const restore = () => window.scrollTo({ top: scrollY, left: 0 });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });
    timers.push(setTimeout(restore, 50));
    timers.push(setTimeout(restore, 150));
    timers.push(setTimeout(restore, 300));
  }, [
    conCancelados,
    vista,
    periodoGraficoSeleccionado,
    facultadGraficoSeleccionada,
    programaGraficoSeleccionado,
    nivelGraficoSeleccionado,
    periodoGraficoDesercionSeleccionado,
    facultadGraficoDesercionSeleccionada,
    programaGraficoDesercionSeleccionado,
    nivelGraficoDesercionSeleccionado,
    periodoTasaDesercionGraficoSeleccionado,
    facultadTasaDesercionGraficoSeleccionada,
    programaTasaDesercionGraficoSeleccionado,
    nivelTasaDesercionGraficoSeleccionado,
    periodoTasaDesercionCohorteGraficoSeleccionado,
    facultadTasaDesercionCohorteGraficoSeleccionada,
    programaTasaDesercionCohorteGraficoSeleccionado,
    nivelTasaDesercionCohorteGraficoSeleccionado,
    periodoTasaDesercionPromedioGraficoSeleccionado,
    facultadTasaDesercionPromedioGraficoSeleccionada,
    programaTasaDesercionPromedioGraficoSeleccionado,
    nivelTasaDesercionPromedioGraficoSeleccionado,
    periodoTasaGraduacionGraficoSeleccionado,
    facultadTasaGraduacionGraficoSeleccionada,
    programaTasaGraduacionGraficoSeleccionado,
    nivelTasaGraduacionGraficoSeleccionado,
    periodoTasaAusenciaGraficoSeleccionado,
    facultadTasaAusenciaGraficoSeleccionada,
    programaTasaAusenciaGraficoSeleccionado,
    nivelTasaAusenciaGraficoSeleccionado,
    periodoTasaSupervivenciaGraficoSeleccionado,
    facultadTasaSupervivenciaGraficoSeleccionada,
    programaTasaSupervivenciaGraficoSeleccionado,
    nivelTasaSupervivenciaGraficoSeleccionado,
    periodoTasaDesercion28GraficoSeleccionado,
    facultadTasaDesercion28GraficoSeleccionada,
    programaTasaDesercion28GraficoSeleccionado,
    nivelTasaDesercion28GraficoSeleccionado
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos' && graficoSeccion === 'primiparos') {
      // Mantener el gráfico de período completo, solo resaltar selección
      fetchEstadisticaPrimiparosPeriodo(
        token,
        null,
        facultadGraficoPrimiparosSeleccionada,
        programaGraficoPrimiparosSeleccionado,
        nivelGraficoPrimiparosSeleccionado
      );
      fetchEstadisticaPrimiparosFacultad(
        token,
        periodoGraficoPrimiparosSeleccionado,
        programaGraficoPrimiparosSeleccionado,
        nivelGraficoPrimiparosSeleccionado
      );
      fetchEstadisticaPrimiparosPrograma(
        token,
        periodoGraficoPrimiparosSeleccionado,
        facultadGraficoPrimiparosSeleccionada,
        nivelGraficoPrimiparosSeleccionado
      );
      fetchEstadisticaPrimiparosNivel(
        token,
        periodoGraficoPrimiparosSeleccionado,
        facultadGraficoPrimiparosSeleccionada,
        programaGraficoPrimiparosSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    graficoSeccion,
    periodoGraficoPrimiparosSeleccionado,
    facultadGraficoPrimiparosSeleccionada,
    programaGraficoPrimiparosSeleccionado,
    nivelGraficoPrimiparosSeleccionado
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos' && graficoSeccion === 'graduados') {
      // Mantener el gráfico de período completo, solo resaltar selección
      fetchEstadisticaGraduadosPeriodo(
        token,
        null,
        facultadGraficoGraduadosSeleccionada,
        programaGraficoGraduadosSeleccionado,
        nivelGraficoGraduadosSeleccionado
      );
      fetchEstadisticaGraduadosFacultad(
        token,
        periodoGraficoGraduadosSeleccionado,
        programaGraficoGraduadosSeleccionado,
        nivelGraficoGraduadosSeleccionado
      );
      fetchEstadisticaGraduadosPrograma(
        token,
        periodoGraficoGraduadosSeleccionado,
        facultadGraficoGraduadosSeleccionada,
        nivelGraficoGraduadosSeleccionado
      );
      fetchEstadisticaGraduadosNivel(
        token,
        periodoGraficoGraduadosSeleccionado,
        facultadGraficoGraduadosSeleccionada,
        programaGraficoGraduadosSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    graficoSeccion,
    periodoGraficoGraduadosSeleccionado,
    facultadGraficoGraduadosSeleccionada,
    programaGraficoGraduadosSeleccionado,
    nivelGraficoGraduadosSeleccionado
  ]);

  useEffect(() => {
    if (isAuthenticated && vista === 'graficos' && graficoSeccion === 'ausencia-intersemestral') {
      // Mantener el gráfico de período completo, solo resaltar selección
      fetchEstadisticaAusenciaPeriodo(
        token,
        null,
        facultadGraficoAusenciaSeleccionada,
        programaGraficoAusenciaSeleccionado,
        nivelGraficoAusenciaSeleccionado
      );
      fetchEstadisticaAusenciaFacultad(
        token,
        periodoGraficoAusenciaSeleccionado,
        programaGraficoAusenciaSeleccionado,
        nivelGraficoAusenciaSeleccionado
      );
      fetchEstadisticaAusenciaPrograma(
        token,
        periodoGraficoAusenciaSeleccionado,
        facultadGraficoAusenciaSeleccionada,
        nivelGraficoAusenciaSeleccionado
      );
      fetchEstadisticaAusenciaNivel(
        token,
        periodoGraficoAusenciaSeleccionado,
        facultadGraficoAusenciaSeleccionada,
        programaGraficoAusenciaSeleccionado
      );
    }
  }, [
    isAuthenticated,
    vista,
    token,
    conCancelados,
    graficoSeccion,
    periodoGraficoAusenciaSeleccionado,
    facultadGraficoAusenciaSeleccionada,
    programaGraficoAusenciaSeleccionado,
    nivelGraficoAusenciaSeleccionado
  ]);

  const filtrosGraficos = [
    { label: 'Periodo', value: periodoGraficoSeleccionado, onRemove: () => setPeriodoGraficoSeleccionado(null) },
    { label: 'Facultad', value: facultadGraficoSeleccionada, onRemove: () => setFacultadGraficoSeleccionada(null) },
    { label: 'Programa', value: programaGraficoSeleccionado, onRemove: () => setProgramaGraficoSeleccionado(null) },
    { label: 'Nivel', value: nivelGraficoSeleccionado ? `Nivel ${nivelGraficoSeleccionado}` : null, onRemove: () => setNivelGraficoSeleccionado(null) }
  ];
  const filtrosGraficosDesercion = [
    { label: 'Periodo', value: periodoGraficoDesercionSeleccionado, onRemove: () => setPeriodoGraficoDesercionSeleccionado(null) },
    { label: 'Facultad', value: facultadGraficoDesercionSeleccionada, onRemove: () => setFacultadGraficoDesercionSeleccionada(null) },
    { label: 'Programa', value: programaGraficoDesercionSeleccionado, onRemove: () => setProgramaGraficoDesercionSeleccionado(null) },
    { label: 'Nivel', value: nivelGraficoDesercionSeleccionado ? `Nivel ${nivelGraficoDesercionSeleccionado}` : null, onRemove: () => setNivelGraficoDesercionSeleccionado(null) }
  ];
  const filtrosGraficosPrimiparos = [
    { label: 'Periodo', value: periodoGraficoPrimiparosSeleccionado, onRemove: () => setPeriodoGraficoPrimiparosSeleccionado(null) },
    { label: 'Facultad', value: facultadGraficoPrimiparosSeleccionada, onRemove: () => setFacultadGraficoPrimiparosSeleccionada(null) },
    { label: 'Programa', value: programaGraficoPrimiparosSeleccionado, onRemove: () => setProgramaGraficoPrimiparosSeleccionado(null) },
    { label: 'Nivel', value: nivelGraficoPrimiparosSeleccionado ? `Nivel ${nivelGraficoPrimiparosSeleccionado}` : null, onRemove: () => setNivelGraficoPrimiparosSeleccionado(null) }
  ];
  const filtrosGraficosGraduados = [
    { label: 'Periodo', value: periodoGraficoGraduadosSeleccionado, onRemove: () => setPeriodoGraficoGraduadosSeleccionado(null) },
    { label: 'Facultad', value: facultadGraficoGraduadosSeleccionada, onRemove: () => setFacultadGraficoGraduadosSeleccionada(null) },
    { label: 'Programa', value: programaGraficoGraduadosSeleccionado, onRemove: () => setProgramaGraficoGraduadosSeleccionado(null) },
    { label: 'Nivel', value: nivelGraficoGraduadosSeleccionado ? `Nivel ${nivelGraficoGraduadosSeleccionado}` : null, onRemove: () => setNivelGraficoGraduadosSeleccionado(null) }
  ];
  const filtrosGraficosAusencia = [
    { label: 'Periodo', value: periodoGraficoAusenciaSeleccionado, onRemove: () => setPeriodoGraficoAusenciaSeleccionado(null) },
    { label: 'Facultad', value: facultadGraficoAusenciaSeleccionada, onRemove: () => setFacultadGraficoAusenciaSeleccionada(null) },
    { label: 'Programa', value: programaGraficoAusenciaSeleccionado, onRemove: () => setProgramaGraficoAusenciaSeleccionado(null) },
    { label: 'Nivel', value: nivelGraficoAusenciaSeleccionado ? `Nivel ${nivelGraficoAusenciaSeleccionado}` : null, onRemove: () => setNivelGraficoAusenciaSeleccionado(null) }
  ];
  const filtrosGraficosTasaDesercion = [
    { label: 'Periodo', value: periodoTasaDesercionGraficoSeleccionado, onRemove: () => setPeriodoTasaDesercionGraficoSeleccionado(null) },
    { label: 'Facultad', value: facultadTasaDesercionGraficoSeleccionada, onRemove: () => setFacultadTasaDesercionGraficoSeleccionada(null) },
    { label: 'Programa', value: programaTasaDesercionGraficoSeleccionado, onRemove: () => setProgramaTasaDesercionGraficoSeleccionado(null) },
    { label: 'Nivel', value: nivelTasaDesercionGraficoSeleccionado ? `Nivel ${nivelTasaDesercionGraficoSeleccionado}` : null, onRemove: () => setNivelTasaDesercionGraficoSeleccionado(null) }
  ];
  const filtrosGraficosTasaDesercionCohorte = [
    { label: 'Cohorte', value: periodoTasaDesercionCohorteGraficoSeleccionado, onRemove: () => setPeriodoTasaDesercionCohorteGraficoSeleccionado(null) },
    { label: 'Facultad', value: facultadTasaDesercionCohorteGraficoSeleccionada, onRemove: () => setFacultadTasaDesercionCohorteGraficoSeleccionada(null) },
    { label: 'Programa', value: programaTasaDesercionCohorteGraficoSeleccionado, onRemove: () => setProgramaTasaDesercionCohorteGraficoSeleccionado(null) },
    { label: 'Nivel', value: nivelTasaDesercionCohorteGraficoSeleccionado ? `Nivel ${nivelTasaDesercionCohorteGraficoSeleccionado}` : null, onRemove: () => setNivelTasaDesercionCohorteGraficoSeleccionado(null) }
  ];
  const filtrosGraficosTasaDesercionPromedio = [
    { label: 'Periodo', value: periodoTasaDesercionPromedioGraficoSeleccionado, onRemove: () => setPeriodoTasaDesercionPromedioGraficoSeleccionado(null) },
    { label: 'Facultad', value: facultadTasaDesercionPromedioGraficoSeleccionada, onRemove: () => setFacultadTasaDesercionPromedioGraficoSeleccionada(null) },
    { label: 'Programa', value: programaTasaDesercionPromedioGraficoSeleccionado, onRemove: () => setProgramaTasaDesercionPromedioGraficoSeleccionado(null) },
    { label: 'Nivel', value: nivelTasaDesercionPromedioGraficoSeleccionado ? `Nivel ${nivelTasaDesercionPromedioGraficoSeleccionado}` : null, onRemove: () => setNivelTasaDesercionPromedioGraficoSeleccionado(null) }
  ];
  const filtrosGraficosTasaGraduacion = [
    { label: 'Periodo', value: periodoTasaGraduacionGraficoSeleccionado, onRemove: () => setPeriodoTasaGraduacionGraficoSeleccionado(null) },
    { label: 'Facultad', value: facultadTasaGraduacionGraficoSeleccionada, onRemove: () => setFacultadTasaGraduacionGraficoSeleccionada(null) },
    { label: 'Programa', value: programaTasaGraduacionGraficoSeleccionado, onRemove: () => setProgramaTasaGraduacionGraficoSeleccionado(null) },
    { label: 'Nivel', value: nivelTasaGraduacionGraficoSeleccionado ? `Nivel ${nivelTasaGraduacionGraficoSeleccionado}` : null, onRemove: () => setNivelTasaGraduacionGraficoSeleccionado(null) }
  ];
  const filtrosGraficosTasaAusencia = [
    { label: 'Periodo', value: periodoTasaAusenciaGraficoSeleccionado, onRemove: () => setPeriodoTasaAusenciaGraficoSeleccionado(null) },
    { label: 'Facultad', value: facultadTasaAusenciaGraficoSeleccionada, onRemove: () => setFacultadTasaAusenciaGraficoSeleccionada(null) },
    { label: 'Programa', value: programaTasaAusenciaGraficoSeleccionado, onRemove: () => setProgramaTasaAusenciaGraficoSeleccionado(null) },
    { label: 'Nivel', value: nivelTasaAusenciaGraficoSeleccionado ? `Nivel ${nivelTasaAusenciaGraficoSeleccionado}` : null, onRemove: () => setNivelTasaAusenciaGraficoSeleccionado(null) }
  ];
  const filtrosGraficosTasaSupervivencia = [
    { label: 'Periodo', value: periodoTasaSupervivenciaGraficoSeleccionado, onRemove: () => setPeriodoTasaSupervivenciaGraficoSeleccionado(null) },
    { label: 'Facultad', value: facultadTasaSupervivenciaGraficoSeleccionada, onRemove: () => setFacultadTasaSupervivenciaGraficoSeleccionada(null) },
    { label: 'Programa', value: programaTasaSupervivenciaGraficoSeleccionado, onRemove: () => setProgramaTasaSupervivenciaGraficoSeleccionado(null) },
    { label: 'Nivel', value: nivelTasaSupervivenciaGraficoSeleccionado ? `Nivel ${nivelTasaSupervivenciaGraficoSeleccionado}` : null, onRemove: () => setNivelTasaSupervivenciaGraficoSeleccionado(null) }
  ];
  const filtrosGraficosTasaDesercion28 = [
    { label: 'Periodo', value: periodoTasaDesercion28GraficoSeleccionado, onRemove: () => setPeriodoTasaDesercion28GraficoSeleccionado(null) },
    { label: 'Facultad', value: facultadTasaDesercion28GraficoSeleccionada, onRemove: () => setFacultadTasaDesercion28GraficoSeleccionada(null) },
    { label: 'Programa', value: programaTasaDesercion28GraficoSeleccionado, onRemove: () => setProgramaTasaDesercion28GraficoSeleccionado(null) },
    { label: 'Nivel', value: nivelTasaDesercion28GraficoSeleccionado ? `Nivel ${nivelTasaDesercion28GraficoSeleccionado}` : null, onRemove: () => setNivelTasaDesercion28GraficoSeleccionado(null) }
  ];
  const tasaDesercionNivelOrdenado = useMemo(() => {
    const toNumber = (value) => {
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
    };
    return [...tasaDesercionNivelGrafico].sort((a, b) => toNumber(a.nivel) - toNumber(b.nivel));
  }, [tasaDesercionNivelGrafico]);
  const riesgoOrdenado = useMemo(() => {
    return [...riesgoLista].sort((a, b) => (b.prob_deserto || 0) - (a.prob_deserto || 0));
  }, [riesgoLista]);
  const tasaDesercionCohorteNivelOrdenado = useMemo(() => {
    const toNumber = (value) => {
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
    };
    return [...tasaDesercionCohorteNivelGrafico].sort((a, b) => toNumber(a.nivel) - toNumber(b.nivel));
  }, [tasaDesercionCohorteNivelGrafico]);
  const graficoSeccionLabels = {
    matriculas: 'Matrículas',
    desercion: 'Deserción',
    primiparos: 'Primíparos',
    graduados: 'Graduados',
    'ausencia-intersemestral': 'Ausencia intersemestral'
  };
  const graficoSeccionLabel = graficoSeccionLabels[graficoSeccion] || 'Matrículas';
  const tablaHeaderBg = modoOscuro ? '#222' : '#f8f9fa';
  const manualDondeColor = modoOscuro ? '#b0b0b0' : '#666';

  return (
    <div className={`App${modoOscuro ? ' dark-mode' : ''}`}>
      <h1 style={{marginLeft: isAuthenticated ? 220 : 0}}>
        {vista === 'ausencia-intersemestral' ? 'Ausencia Intersemestral' :
         vista === 'desercion' ? 'Deserción' : 
         vista === 'primiparos' ? 'Primíparos' :
         vista === 'graduados' ? 'Graduados' :
        vista === 'tasa-desercion' ? 'Tasa de Deserción Anual' : 
        vista === 'graficos-tasa-desercion' ? 'Gráficos Tasa de Deserción Anual' :
        vista === 'graficos-tasa-desercion-cohorte' ? 'Gráficos Tasa de Deserción por Cohorte' :
        vista === 'graficos-tasa-desercion-promedio' ? 'Gráficos Tasa de Deserción Promedio Acumulada' :
        vista === 'graficos-tasa-graduacion' ? 'Gráficos Tasa de Graduación Acumulada' :
        vista === 'graficos-tasa-ausencia-intersemestral' ? 'Gráficos Tasa de Ausencia Intersemestral' :
        vista === 'graficos-tasa-supervivencia' ? 'Gráficos Tasa de Supervivencia' :
        vista === 'graficos-tasa-desercion-periodo-2-8' ? 'Gráficos Tasa de Deserción Periodo 2.8' :
         vista === 'tasa-desercion-cohorte' ? 'Tasa de Deserción por Cohorte' :
         vista === 'tasa-desercion-promedio' ? 'Tasa de Deserción Promedio Acumulada' :
         vista === 'tasa-graduacion' ? 'Tasa de Graduación Acumulada' :
         vista === 'tasa-ausencia-intersemestral' ? 'Tasa de ausencia Intersemestral' :
         vista === 'tasa-supervivencia' ? 'Tasa de Supervivencia' :
        vista === 'tasa-desercion-periodo-2-8' ? 'Tasa deserción periodo 2.8' :
        vista === 'riesgo-desercion' ? 'Riesgo de deserción (ML)' :
        vista === 'manual-usuario' ? 'Manual de usuario' :
        vista === 'configuracion' ? 'Configuración' :
        vista === 'graficos' ? `Gráficos de ${graficoSeccionLabel}` : 
         vista === 'matriculas' ? 'Matrículas' : 'Registros de Matrículas'}
      </h1>
      {!isAuthenticated ? (
        <form onSubmit={handleLogin} style={{margin: '2rem auto', maxWidth: 300}}>
          <h2>Iniciar Sesión</h2>
          <input
            type="text"
            name="username"
            placeholder="Usuario"
            value={loginData.username}
            onChange={handleLoginChange}
            required
            style={{display: 'block', width: '100%', marginBottom: 10}}
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={loginData.password}
            onChange={handleLoginChange}
            required
            style={{display: 'block', width: '100%', marginBottom: 10}}
          />
          <button type="submit" style={{width: '100%'}}>Entrar</button>
          {loginError && <p style={{color: 'red'}}>{loginError}</p>}
        </form>
      ) : (
        <div style={{display: 'flex'}}>
          <Sidebar />
          <div style={{
            marginLeft: 220,
            width: '80%',
            backgroundColor: modoOscuro ? '#121212' : '#fff',
            minHeight: '100vh'
          }}>
            {vista === 'matriculas' && (
              <>
                <div style={{display: 'flex', gap: 10, marginBottom: 20}}>
                  {periodos.length > 0 && (
                    <div>
                      <label htmlFor="periodo">Período: </label>
                      <select id="periodo" value={periodoSeleccionado} onChange={handlePeriodoChange}>
                        <option value="">-- Todos --</option>
                        {periodos.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {facultades.length > 0 && (
                    <div>
                      <label htmlFor="facultadMatriculas">Facultad: </label>
                      <select id="facultadMatriculas" value={facultadMatriculas} onChange={e => {
                        setFacultadMatriculas(e.target.value);
                        setProgramaMatriculas('');
                      }}>
                        <option value="">-- Todos --</option>
                        {facultades.map((fac) => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(programasMatriculas.length > 0 || facultadMatriculas) && (
                    <div>
                      <label htmlFor="programaMatriculas">Programa: </label>
                      <select id="programaMatriculas" value={programaMatriculas} onChange={e => {
                        const valor = e.target.value;
                        setProgramaMatriculas(valor);
                        if (valor && token) fetchFacultadDePrograma(token, valor);
                        else setFacultadMatriculas('');
                      }}>
                        <option value="">-- Todos --</option>
                        {programasMatriculas.map((prog) => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {loading && <p>Cargando...</p>}
                {error && <p style={{color: 'red'}}>{error}</p>}
                {!loading && !error && (
                  <>
                    {matriculas.length > 0 && (
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <p style={{fontWeight: 'bold', margin: 0}}>Cantidad de registros: {matriculas.length}</p>
                        <button
                          onClick={() => exportarCSV(matriculas, 'matriculas')}
                          style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title="Exportar datos a CSV"
                        >
                          📊 Exportar CSV
                        </button>
                      </div>
                    )}
                    <table border="1" style={{margin: '0 auto'}}>
                      <thead>
                        <tr style={{backgroundColor: tablaHeaderBg}}>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: tablaHeaderBg, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matriculas.map((matricula, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{celdaTexto(matricula.NombrePeriodo)}</td>
                            <td>{celdaTexto(matricula.PROGRAMA)}</td>
                            <td>{celdaTexto(matricula.facultad || matricula.FACULTAD)}</td>
                            <td>{celdaTexto(matricula.ESTUDIANTE)}</td>
                            <td>{celdaTexto(matricula.CODIGO)}</td>
                            <td>{celdaTexto(matricula.ESTADOMATRICULA)}</td>
                            <td>{celdaTexto(matricula.NIVEL)}</td>
                            <td>{celdaTexto(matricula.PERINGRESO)}</td>
                            <td>{celdaTexto(matricula.EstadoEstudiante)}</td>
                            <td>{celdaTexto(matricula.tipodocumento || matricula.TIPODOCUMENTO)}</td>
                            <td>{celdaTexto(matricula.documento || matricula.DOCUMENTO)}</td>
                            <td>{celdaTexto(matricula.telefonoppal || matricula.TELEFONOPPAL)}</td>
                            <td>{celdaTexto(matricula.celular || matricula.CELULAR)}</td>
                            <td>{celdaTexto(matricula.correounac || matricula.CORREOUNAC)}</td>
                            <td>{celdaTexto(matricula.correootro || matricula.CORREOOTRO)}</td>
                            <td>{celdaTexto(matricula.muniprocedencia || matricula.MUNIPROCEDENCIA)}</td>
                            <td>{celdaTexto(matricula.dptoprocedencia || matricula.DPTOPROCEDENCIA)}</td>
                            <td>{celdaTexto(matricula.paisprocedencia || matricula.PAISPROCEDENCIA)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
            {vista === 'desercion' && (
              <div style={{padding: '0 0 0 0'}}>
                <div style={{display: 'flex', gap: 20, marginBottom: 20}}>
                  {periodos.length > 0 && (
                    <div>
                      <label htmlFor="periodoDesercion">Período: </label>
                      <select id="periodoDesercion" value={periodoDesercion} onChange={e => setPeriodoDesercion(e.target.value)}>
                        <option value="">-- Todos --</option>
                        {periodos.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {facultades.length > 0 && (
                    <div>
                      <label htmlFor="facultadDesercion">Facultad: </label>
                      <select id="facultadDesercion" value={facultadDesercion} onChange={e => {
                        setFacultadDesercion(e.target.value);
                        setProgramaDesercion('');
                      }}>
                        <option value="">-- Todos --</option>
                        {facultades.map((fac) => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(programasDesercion.length > 0 || facultadDesercion) && (
                    <div>
                      <label htmlFor="programaDesercion">Programa: </label>
                      <select id="programaDesercion" value={programaDesercion} onChange={e => {
                        const valor = e.target.value;
                        setProgramaDesercion(valor);
                        if (valor && token) fetchFacultadDePrograma(token, valor, setFacultadDesercion);
                        else setFacultadDesercion('');
                      }}>
                        <option value="">-- Todos --</option>
                        {programasDesercion.map((prog) => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {loadingDesercion && <p>Cargando...</p>}
                {errorDesercion && <p style={{color: 'red'}}>{errorDesercion}</p>}
                {!loadingDesercion && !errorDesercion && desercion.length > 0 && (
                  <>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <p style={{fontWeight: 'bold', margin: 0}}>Cantidad de registros: {desercion.length}</p>
                      <button
                        onClick={() => exportarCSV(desercion, 'desercion')}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        title="Exportar datos a CSV"
                      >
                        📊 Exportar CSV
                      </button>
                    </div>
                    <table border="1" style={{margin: '0 auto'}}>
                      <thead>
                        <tr style={{backgroundColor: '#f8f9fa'}}>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {desercion.map((item, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{celdaTexto(item.periodoSiguiente)}</td>
                            <td>{celdaTexto(item.programa)}</td>
                            <td>{celdaTexto(item.facultad)}</td>
                            <td>{celdaTexto(item.estudiante)}</td>
                            <td>{celdaTexto(item.codigo)}</td>
                            <td>{celdaTexto(item.estadomatricula)}</td>
                            <td>{celdaTexto(item.nivel)}</td>
                            <td>{celdaTexto(item.peringreso)}</td>
                            <td>{celdaTexto(item.estadoEstudiante)}</td>
                            <td>{celdaTexto(item.tipodocumento)}</td>
                            <td>{celdaTexto(item.documento)}</td>
                            <td>{celdaTexto(item.telefonoppal)}</td>
                            <td>{celdaTexto(item.celular)}</td>
                            <td>{celdaTexto(item.correounac)}</td>
                            <td>{celdaTexto(item.correootro)}</td>
                            <td>{celdaTexto(item.muniprocedencia)}</td>
                            <td>{celdaTexto(item.dptoprocedencia)}</td>
                            <td>{celdaTexto(item.paisprocedencia)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {!loadingDesercion && !errorDesercion && desercion.length === 0 && (
                  <p>No se encontraron registros de deserción.</p>
                )}
              </div>
            )}
            {vista === 'ausencia-intersemestral' && (
              <div style={{padding: '0 0 0 0'}}>
                <div style={{display: 'flex', gap: 20, marginBottom: 20}}>
                  {periodos.length > 0 && (
                    <div>
                      <label htmlFor="periodoAusenciaIntersemestral">Período: </label>
                      <select id="periodoAusenciaIntersemestral" value={periodoAusenciaIntersemestral} onChange={e => setPeriodoAusenciaIntersemestral(e.target.value)}>
                        <option value="">-- Todos --</option>
                        {periodos.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {facultades.length > 0 && (
                    <div>
                      <label htmlFor="facultadAusenciaIntersemestral">Facultad: </label>
                      <select id="facultadAusenciaIntersemestral" value={facultadAusenciaIntersemestral} onChange={e => {
                        setFacultadAusenciaIntersemestral(e.target.value);
                        setProgramaAusenciaIntersemestral('');
                      }}>
                        <option value="">-- Todos --</option>
                        {facultades.map((fac) => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(programasAusencia.length > 0 || facultadAusenciaIntersemestral) && (
                    <div>
                      <label htmlFor="programaAusenciaIntersemestral">Programa: </label>
                      <select id="programaAusenciaIntersemestral" value={programaAusenciaIntersemestral} onChange={e => {
                        const valor = e.target.value;
                        setProgramaAusenciaIntersemestral(valor);
                        if (valor && token) fetchFacultadDePrograma(token, valor, setFacultadAusenciaIntersemestral);
                        else setFacultadAusenciaIntersemestral('');
                      }}>
                        <option value="">-- Todos --</option>
                        {programasAusencia.map((prog) => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {loadingAusenciaIntersemestral && <p>Cargando...</p>}
                {errorAusenciaIntersemestral && <p style={{color: 'red'}}>{errorAusenciaIntersemestral}</p>}
                {!loadingAusenciaIntersemestral && !errorAusenciaIntersemestral && ausenciaIntersemestral.length > 0 && (
                  <>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <p style={{fontWeight: 'bold', margin: 0}}>Cantidad de registros: {ausenciaIntersemestral.length}</p>
                      <button
                        onClick={() => exportarCSV(ausenciaIntersemestral, 'ausencia-intersemestral')}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        title="Exportar datos a CSV"
                      >
                        📊 Exportar CSV
                      </button>
                    </div>
                    <table border="1" style={{margin: '0 auto'}}>
                      <thead>
                        <tr style={{backgroundColor: '#f8f9fa'}}>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ausenciaIntersemestral.map((item, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{celdaTexto(item.periodoSiguiente)}</td>
                            <td>{celdaTexto(item.programa)}</td>
                            <td>{celdaTexto(item.facultad)}</td>
                            <td>{celdaTexto(item.estudiante)}</td>
                            <td>{celdaTexto(item.codigo)}</td>
                            <td>{celdaTexto(item.estadomatricula)}</td>
                            <td>{celdaTexto(item.nivel)}</td>
                            <td>{celdaTexto(item.peringreso)}</td>
                            <td>{celdaTexto(item.estadoEstudiante)}</td>
                            <td>{celdaTexto(item.tipodocumento)}</td>
                            <td>{celdaTexto(item.documento)}</td>
                            <td>{celdaTexto(item.telefonoppal)}</td>
                            <td>{celdaTexto(item.celular)}</td>
                            <td>{celdaTexto(item.correounac)}</td>
                            <td>{celdaTexto(item.correootro)}</td>
                            <td>{celdaTexto(item.muniprocedencia)}</td>
                            <td>{celdaTexto(item.dptoprocedencia)}</td>
                            <td>{celdaTexto(item.paisprocedencia)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {!loadingAusenciaIntersemestral && !errorAusenciaIntersemestral && ausenciaIntersemestral.length === 0 && (
                  <p>No se encontraron registros de ausencia intersemestral.</p>
                )}
              </div>
            )}
            {vista === 'primiparos' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', gap: 20, marginBottom: 20}}>
                  {periodos.length > 0 && (
                    <div>
                      <label htmlFor="periodoPrimiparos">Período: </label>
                      <select id="periodoPrimiparos" value={periodoPrimiparos} onChange={e => {
                        setPeriodoPrimiparos(e.target.value);
                        fetchPrimiparos(token, e.target.value, programaPrimiparos, facultadPrimiparos);
                      }}>
                        <option value="">-- Todos --</option>
                        {periodos.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {facultades.length > 0 && (
                    <div>
                      <label htmlFor="facultadPrimiparos">Facultad: </label>
                      <select id="facultadPrimiparos" value={facultadPrimiparos} onChange={e => {
                        setFacultadPrimiparos(e.target.value);
                        setProgramaPrimiparos('');
                      }}>
                        <option value="">-- Todos --</option>
                        {facultades.map((fac) => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(programasPrimiparos.length > 0 || facultadPrimiparos) && (
                    <div>
                      <label htmlFor="programaPrimiparos">Programa: </label>
                      <select id="programaPrimiparos" value={programaPrimiparos} onChange={e => {
                        const valor = e.target.value;
                        setProgramaPrimiparos(valor);
                        if (valor && token) fetchFacultadDePrograma(token, valor, setFacultadPrimiparos);
                        else setFacultadPrimiparos('');
                      }}>
                        <option value="">-- Todos --</option>
                        {programasPrimiparos.map((prog) => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {loadingPrimiparos && <p>Cargando...</p>}
                {errorPrimiparos && <p style={{color: 'red'}}>{errorPrimiparos}</p>}
                {!loadingPrimiparos && !errorPrimiparos && (
                  <>
                    {primiparos.length > 0 && (
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <p style={{fontWeight: 'bold', margin: 0}}>Cantidad de registros: {primiparos.length}</p>
                        <button
                          onClick={() => exportarCSV(primiparos, 'primiparos')}
                          style={{
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title="Exportar datos a CSV"
                        >
                          📊 Exportar CSV
                        </button>
                      </div>
                    )}
                    <table border="1" style={{margin: '0 auto'}}>
                      <thead>
                        <tr style={{backgroundColor: '#f8f9fa'}}>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {primiparos.map((primiparo, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{celdaTexto(primiparo.NombrePeriodo)}</td>
                            <td>{celdaTexto(primiparo.PROGRAMA)}</td>
                            <td>{celdaTexto(primiparo.facultad || primiparo.FACULTAD)}</td>
                            <td>{celdaTexto(primiparo.ESTUDIANTE)}</td>
                            <td>{celdaTexto(primiparo.CODIGO)}</td>
                            <td>{celdaTexto(primiparo.ESTADOMATRICULA)}</td>
                            <td>{celdaTexto(primiparo.NIVEL)}</td>
                            <td>{celdaTexto(primiparo.PERINGRESO)}</td>
                            <td>{celdaTexto(primiparo.EstadoEstudiante)}</td>
                            <td>{celdaTexto(primiparo.tipodocumento || primiparo.TIPODOCUMENTO)}</td>
                            <td>{celdaTexto(primiparo.documento || primiparo.DOCUMENTO)}</td>
                            <td>{celdaTexto(primiparo.telefonoppal || primiparo.TELEFONOPPAL)}</td>
                            <td>{celdaTexto(primiparo.celular || primiparo.CELULAR)}</td>
                            <td>{celdaTexto(primiparo.correounac || primiparo.CORREOUNAC)}</td>
                            <td>{celdaTexto(primiparo.correootro || primiparo.CORREOOTRO)}</td>
                            <td>{celdaTexto(primiparo.muniprocedencia || primiparo.MUNIPROCEDENCIA)}</td>
                            <td>{celdaTexto(primiparo.dptoprocedencia || primiparo.DPTOPROCEDENCIA)}</td>
                            <td>{celdaTexto(primiparo.paisprocedencia || primiparo.PAISPROCEDENCIA)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {primiparos.length === 0 && !loadingPrimiparos && (
                      <p>No se encontraron registros de primíparos.</p>
                    )}
                  </>
                )}
              </div>
            )}
            {vista === 'graduados' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', gap: 20, marginBottom: 20}}>
                  {periodos.length > 0 && (
                    <div>
                      <label htmlFor="periodoGraduados">Período: </label>
                      <select id="periodoGraduados" value={periodoGraduados} onChange={e => {
                        setPeriodoGraduados(e.target.value);
                        fetchGraduados(token, e.target.value, programaGraduados, facultadGraduados);
                      }}>
                        <option value="">-- Todos --</option>
                        {periodos.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {facultades.length > 0 && (
                    <div>
                      <label htmlFor="facultadGraduados">Facultad: </label>
                      <select id="facultadGraduados" value={facultadGraduados} onChange={e => {
                        setFacultadGraduados(e.target.value);
                        setProgramaGraduados('');
                      }}>
                        <option value="">-- Todos --</option>
                        {facultades.map((fac) => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(programasGraduados.length > 0 || facultadGraduados) && (
                    <div>
                      <label htmlFor="programaGraduados">Programa: </label>
                      <select id="programaGraduados" value={programaGraduados} onChange={e => {
                        const valor = e.target.value;
                        setProgramaGraduados(valor);
                        if (valor && token) fetchFacultadDePrograma(token, valor, setFacultadGraduados);
                        else setFacultadGraduados('');
                      }}>
                        <option value="">-- Todos --</option>
                        {programasGraduados.map((prog) => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {loadingGraduados && <p>Cargando...</p>}
                {errorGraduados && <p style={{color: 'red'}}>{errorGraduados}</p>}
                {!loadingGraduados && !errorGraduados && (
                  <>
                    {graduados.length > 0 && (
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <p style={{fontWeight: 'bold', margin: 0}}>Cantidad de registros: {graduados.length}</p>
                        <button
                          onClick={() => exportarCSV(graduados, 'graduados')}
                          style={{
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title="Exportar datos a CSV"
                        >
                          📊 Exportar CSV
                        </button>
                      </div>
                    )}
                    <table border="1" style={{margin: '0 auto'}}>
                      <thead>
                        <tr style={{backgroundColor: '#f8f9fa'}}>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {graduados.map((graduado, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{celdaTexto(graduado.NombrePeriodo)}</td>
                            <td>{celdaTexto(graduado.PROGRAMA)}</td>
                            <td>{celdaTexto(graduado.facultad || graduado.FACULTAD)}</td>
                            <td>{celdaTexto(graduado.ESTUDIANTE)}</td>
                            <td>{celdaTexto(graduado.CODIGO)}</td>
                            <td>{celdaTexto(graduado.ESTADOMATRICULA)}</td>
                            <td>{celdaTexto(graduado.NIVEL)}</td>
                            <td>{celdaTexto(graduado.PERINGRESO)}</td>
                            <td>{celdaTexto(graduado.EstadoEstudiante)}</td>
                            <td>{celdaTexto(graduado.tipodocumento || graduado.TIPODOCUMENTO)}</td>
                            <td>{celdaTexto(graduado.documento || graduado.DOCUMENTO)}</td>
                            <td>{celdaTexto(graduado.telefonoppal || graduado.TELEFONOPPAL)}</td>
                            <td>{celdaTexto(graduado.celular || graduado.CELULAR)}</td>
                            <td>{celdaTexto(graduado.correounac || graduado.CORREOUNAC)}</td>
                            <td>{celdaTexto(graduado.correootro || graduado.CORREOOTRO)}</td>
                            <td>{celdaTexto(graduado.muniprocedencia || graduado.MUNIPROCEDENCIA)}</td>
                            <td>{celdaTexto(graduado.dptoprocedencia || graduado.DPTOPROCEDENCIA)}</td>
                            <td>{celdaTexto(graduado.paisprocedencia || graduado.PAISPROCEDENCIA)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {graduados.length === 0 && !loadingGraduados && (
                      <p>No se encontraron registros de graduados.</p>
                    )}
                  </>
                )}
              </div>
            )}
            {vista === 'tasa-desercion-promedio' && (
              <div style={{padding: 20}}>
                {loadingTasaDesercionPromedio && <p>Cargando períodos...</p>}
                {errorTasaDesercionPromedio && <p style={{color: 'red'}}>{errorTasaDesercionPromedio}</p>}
                {!loadingTasaDesercionPromedio && !errorTasaDesercionPromedio && periodosTasaDesercionPromedio.length > 0 && (
                  <div style={{marginTop: 20}}>
                    <div style={{display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="periodoTasaDesercionPromedio" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Período:
                        </label>
                        <select 
                          id="periodoTasaDesercionPromedio" 
                          value={periodoSeleccionadoTasaPromedio} 
                          onChange={handlePeriodoTasaPromedioChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #1976d2',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '200px'
                          }}
                        >
                          <option value="">-- Seleccionar período --</option>
                          {periodosTasaDesercionPromedio.map((periodo) => (
                            <option key={periodo} value={periodo}>{periodo}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="programaTasaDesercionPromedio" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Programa:
                        </label>
                        <select 
                          id="programaTasaDesercionPromedio" 
                          value={programaSeleccionadoTasaPromedio} 
                          onChange={handleProgramaTasaPromedioChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #43a047',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '250px'
                          }}
                        >
                          <option value="">-- Todos --</option>
                          {programasTasaDesercionPromedio.map((programa) => (
                            <option key={programa} value={programa}>{programa}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Sección de cálculo de tasa de deserción promedio */}
                    {periodosTasaDesercionPromedio.length > 0 && (
                      <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        border: '2px solid #6c757d',
                        borderRadius: '10px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: '0', color: '#495057'}}>
                            Cálculo de Tasa de Deserción Promedio Acumulada (TDPA)
                          </h3>
                          <button
                            onClick={() => {
                              const periodoActual = periodoSeleccionadoTasaPromedio || (periodosTasaDesercionPromedio.length > 0 ? periodosTasaDesercionPromedio[0] : '');
                              const programaActual = programaSeleccionadoTasaPromedio || '';
                              calcularTasaDesercionPromedio(token, periodoActual, programaActual);
                            }}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Actualizar
                          </button>
                        </div>
                        
                        {/* Fórmula visual */}
                        <div style={{
                          textAlign: 'center',
                          marginBottom: '30px',
                          padding: '20px',
                          backgroundColor: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px'
                        }}>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            gap: '5px'
                          }}>
                            <span>TDPA<sub>s</sub> = (</span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '20px',
                              flexDirection: 'column',
                              gap: '5px'
                            }}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>Σ<sub>c=1</sub><sup>C</sup> Σ<sub>s=1</sub><sup>S</sup> Desertores<sub>c,s</sub></span>
                              </div>
                              <div style={{borderTop: '2px solid #495057', width: '100%', margin: '5px 0'}}></div>
                              <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>Σ<sub>c=1</sub><sup>C</sup> Primíparos<sub>c</sub></span>
                              </div>
                            </div>
                            <span>) * 100</span>
                          </div>
                          <div style={{fontSize: '14px', color: '#6c757d', marginTop: '10px'}}>
                            Donde c es la cohorte y s el semestre
                          </div>
                        </div>

                        {/* Datos del cálculo */}
                        {loadingCalculoTasaPromedio ? (
                          <div style={{textAlign: 'center', padding: '20px'}}>
                            <p>Cargando datos para el cálculo...</p>
                          </div>
                        ) : errorCalculoTasaPromedio ? (
                          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}>
                            <p>Error al calcular la tasa de deserción promedio: {errorCalculoTasaPromedio}</p>
                          </div>
                        ) : datosTasaDesercionPromedio ? (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            marginTop: '20px'
                          }}>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Desertores</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#dc3545',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickDesertores}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#f8d7da';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de desertores"
                              >
                                {datosTasaDesercionPromedio.desertores}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                Período {datosTasaDesercionPromedio.periodo}
                              </div>
                              <div style={{fontSize: '12px', color: '#dc3545', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Primíparos</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#007bff',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickPrimiparosPromedio}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#e3f2fd';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de primíparos"
                              >
                                {datosTasaDesercionPromedio.primiparos}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                {datosTasaDesercionPromedio.periodoConsulta}
                              </div>
                              <div style={{fontSize: '12px', color: '#007bff', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TDPA</h4>
                              <div style={{
                                fontSize: '32px', 
                                fontWeight: 'bold', 
                                color: '#28a745'
                              }}>
                                {datosTasaDesercionPromedio.tasa}%
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                {datosTasaDesercionPromedio.programa}
                              </div>
                            </div>
                          </div>
                        ) : !programaSeleccionadoTasaPromedio ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            backgroundColor: '#d1ecf1',
                            border: '1px solid #bee5eb',
                            borderRadius: '8px',
                            color: '#0c5460'
                          }}>
                            <p style={{margin: '0', fontSize: '16px', fontWeight: 'bold'}}>
                              Calculando para TODOS los programas
                            </p>
                            <p style={{margin: '5px 0 0 0', fontSize: '14px'}}>
                              Selecciona un programa específico para ver el cálculo individual
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
                {!loadingTasaDesercionPromedio && !errorTasaDesercionPromedio && periodosTasaDesercionPromedio.length === 0 && (
                  <p>No se encontraron períodos disponibles.</p>
                )}
              </div>
            )}
            {vista === 'tasa-graduacion' && (
              <div style={{padding: 20}}>
                {loadingTasaGraduacion && <p>Cargando períodos...</p>}
                {errorTasaGraduacion && <p style={{color: 'red'}}>{errorTasaGraduacion}</p>}
                {!loadingTasaGraduacion && !errorTasaGraduacion && periodosTasaGraduacion.length > 0 && (
                  <div style={{marginTop: 20}}>
                    <div style={{display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="periodoTasaGraduacion" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Período:
                        </label>
                        <select 
                          id="periodoTasaGraduacion" 
                          value={periodoSeleccionadoTasaGraduacion} 
                          onChange={handlePeriodoTasaGraduacionChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #1976d2',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '200px'
                          }}
                        >
                          <option value="">-- Seleccionar período --</option>
                          {periodosTasaGraduacion.map((periodo) => (
                            <option key={periodo} value={periodo}>{periodo}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="programaTasaGraduacion" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Programa:
                        </label>
                        <select 
                          id="programaTasaGraduacion" 
                          value={programaSeleccionadoTasaGraduacion} 
                          onChange={handleProgramaTasaGraduacionChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #43a047',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '250px'
                          }}
                        >
                          <option value="">-- Todos --</option>
                          {programasTasaGraduacion.map((programa) => (
                            <option key={programa} value={programa}>{programa}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Sección de cálculo de tasa de graduación */}
                    {periodosTasaGraduacion.length > 0 && (
                      <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        border: '2px solid #6c757d',
                        borderRadius: '10px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: '0', color: '#495057'}}>
                            Cálculo de Tasa de Graduación Acumulada (TGA)
                          </h3>
                          <button
                            onClick={() => {
                              const periodoActual = periodoSeleccionadoTasaGraduacion || (periodosTasaGraduacion.length > 0 ? periodosTasaGraduacion[0] : '');
                              const programaActual = programaSeleccionadoTasaGraduacion || '';
                              calcularTasaGraduacion(token, periodoActual, programaActual);
                            }}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Actualizar
                          </button>
                        </div>
                        
                        {/* Fórmula visual */}
                        <div style={{
                          textAlign: 'center',
                          marginBottom: '30px',
                          padding: '20px',
                          backgroundColor: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px'
                        }}>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            gap: '5px'
                          }}>
                            <span>TGA<sub>s</sub> = (</span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '20px',
                              flexDirection: 'column',
                              gap: '5px'
                            }}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>Σ<sub>c=1</sub><sup>C</sup> Σ<sub>s=1</sub><sup>S</sup> Graduados<sub>c,s</sub></span>
                              </div>
                              <div style={{borderTop: '2px solid #495057', width: '100%', margin: '5px 0'}}></div>
                              <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>Σ<sub>c=1</sub><sup>C</sup> Primíparos<sub>c</sub></span>
                              </div>
                            </div>
                            <span>) * 100</span>
                          </div>
                          <div style={{fontSize: '14px', color: '#6c757d', marginTop: '10px'}}>
                            Donde c es la cohorte y s el semestre
                          </div>
                        </div>

                        {/* Datos del cálculo */}
                        {loadingCalculoTasaGraduacion ? (
                          <div style={{textAlign: 'center', padding: '20px'}}>
                            <p>Cargando datos para el cálculo...</p>
                          </div>
                        ) : errorCalculoTasaGraduacion ? (
                          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}>
                            <p>Error al calcular la tasa de graduación: {errorCalculoTasaGraduacion}</p>
                          </div>
                        ) : datosTasaGraduacion ? (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            marginTop: '20px'
                          }}>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>Graduados</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#28a745',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickGraduados}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#d4edda';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de graduados"
                              >
                                {datosTasaGraduacion.graduados}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                Período {datosTasaGraduacion.periodo}
                              </div>
                              <div style={{fontSize: '12px', color: '#28a745', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Primíparos</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#007bff',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickPrimiparosGraduacion}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#e3f2fd';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de primíparos"
                              >
                                {datosTasaGraduacion.primiparos}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                {datosTasaGraduacion.periodoConsulta}
                              </div>
                              <div style={{fontSize: '12px', color: '#007bff', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TGA</h4>
                              <div style={{
                                fontSize: '32px', 
                                fontWeight: 'bold', 
                                color: '#28a745'
                              }}>
                                {datosTasaGraduacion.tasa}%
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                {datosTasaGraduacion.programa}
                              </div>
                            </div>
                          </div>
                        ) : !programaSeleccionadoTasaGraduacion ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            backgroundColor: '#d1ecf1',
                            border: '1px solid #bee5eb',
                            borderRadius: '8px',
                            color: '#0c5460'
                          }}>
                            <p style={{margin: '0', fontSize: '16px', fontWeight: 'bold'}}>
                              Calculando para TODOS los programas
                            </p>
                            <p style={{margin: '5px 0 0 0', fontSize: '14px'}}>
                              Selecciona un programa específico para ver el cálculo individual
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
                {!loadingTasaGraduacion && !errorTasaGraduacion && periodosTasaGraduacion.length === 0 && (
                  <p>No se encontraron períodos disponibles.</p>
                )}
              </div>
            )}
            {vista === 'tasa-supervivencia' && (
              <div style={{padding: 20}}>
                {loadingTasaSupervivencia && <p>Cargando períodos...</p>}
                {errorTasaSupervivencia && <p style={{color: 'red'}}>{errorTasaSupervivencia}</p>}
                {!loadingTasaSupervivencia && !errorTasaSupervivencia && periodosTasaSupervivencia.length > 0 && (
                  <div style={{marginTop: 20}}>
                    <div style={{display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="periodoTasaSupervivencia" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Período:
                        </label>
                        <select 
                          id="periodoTasaSupervivencia" 
                          value={periodoSeleccionadoTasaSupervivencia} 
                          onChange={handlePeriodoTasaSupervivenciaChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #1976d2',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '200px'
                          }}
                        >
                          <option value="">-- Seleccionar período --</option>
                          {periodosTasaSupervivencia.map((periodo) => (
                            <option key={periodo} value={periodo}>{periodo}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="programaTasaSupervivencia" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Programa:
                        </label>
                        <select 
                          id="programaTasaSupervivencia" 
                          value={programaSeleccionadoTasaSupervivencia} 
                          onChange={handleProgramaTasaSupervivenciaChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #43a047',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '250px'
                          }}
                        >
                          <option value="">-- Todos --</option>
                          {programasTasaSupervivencia.map((programa) => (
                            <option key={programa} value={programa}>{programa}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Sección de cálculo de tasa de supervivencia */}
                    {periodosTasaSupervivencia.length > 0 && (
                      <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        border: '2px solid #6c757d',
                        borderRadius: '10px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: '0', color: '#495057'}}>
                            Cálculo de Tasa de Supervivencia (TS)
                          </h3>
                          <button
                            onClick={() => {
                              const periodoActual = periodoSeleccionadoTasaSupervivencia || (periodosTasaSupervivencia.length > 0 ? periodosTasaSupervivencia[0] : '');
                              const programaActual = programaSeleccionadoTasaSupervivencia || '';
                              calcularTasaSupervivencia(token, periodoActual, programaActual);
                            }}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Actualizar
                          </button>
                        </div>
                        
                        {/* Fórmula visual */}
                        <div style={{
                          textAlign: 'center',
                          marginBottom: '30px',
                          padding: '20px',
                          backgroundColor: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px'
                        }}>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            gap: '5px'
                          }}>
                            <span>TS<sub>s</sub> = (</span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '20px',
                              flexDirection: 'column',
                              gap: '5px'
                            }}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>Matriculados<sub>s</sub></span>
                              </div>
                              <div style={{borderTop: '2px solid #495057', width: '100%', margin: '5px 0'}}></div>
                              <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span>Primíparos de todas las cohortes que tienen hasta el semestre S</span>
                              </div>
                            </div>
                            <span>) * 100</span>
                          </div>
                          <div style={{fontSize: '14px', color: '#6c757d', marginTop: '10px'}}>
                            Donde s es el semestre
                          </div>
                        </div>

                        {/* Datos del cálculo */}
                        {loadingCalculoTasaSupervivencia ? (
                          <div style={{textAlign: 'center', padding: '20px'}}>
                            <p>Cargando datos para el cálculo...</p>
                          </div>
                        ) : errorCalculoTasaSupervivencia ? (
                          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}>
                            <p>Error al calcular la tasa de supervivencia: {errorCalculoTasaSupervivencia}</p>
                          </div>
                        ) : datosTasaSupervivencia ? (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            marginTop: '20px'
                          }}>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Matriculados</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#007bff',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickMatriculadosSupervivencia}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#e3f2fd';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de matriculados"
                              >
                                {datosTasaSupervivencia.matriculados}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                Período {datosTasaSupervivencia.periodo}
                              </div>
                              <div style={{fontSize: '12px', color: '#007bff', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Primíparos</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#007bff',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickPrimiparosSupervivencia}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#e3f2fd';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de primíparos"
                              >
                                {datosTasaSupervivencia.primiparos}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                {datosTasaSupervivencia.periodoConsulta}
                              </div>
                              <div style={{fontSize: '12px', color: '#007bff', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TS</h4>
                              <div style={{
                                fontSize: '32px', 
                                fontWeight: 'bold', 
                                color: '#28a745'
                              }}>
                                {datosTasaSupervivencia.tasa}%
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                {datosTasaSupervivencia.programa}
                              </div>
                            </div>
                          </div>
                        ) : !programaSeleccionadoTasaSupervivencia ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            backgroundColor: '#d1ecf1',
                            border: '1px solid #bee5eb',
                            borderRadius: '8px',
                            color: '#0c5460'
                          }}>
                            <p style={{margin: '0', fontSize: '16px', fontWeight: 'bold'}}>
                              Calculando para TODOS los programas
                            </p>
                            <p style={{margin: '5px 0 0 0', fontSize: '14px'}}>
                              Selecciona un programa específico para ver el cálculo individual
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
                {!loadingTasaSupervivencia && !errorTasaSupervivencia && periodosTasaSupervivencia.length === 0 && (
                  <p>No se encontraron períodos disponibles.</p>
                )}
              </div>
            )}
            {vista === 'tasa-desercion-cohorte' && (
              <div style={{padding: 20}}>
                {loadingTasaDesercionCohorte && <p>Cargando períodos...</p>}
                {errorTasaDesercionCohorte && <p style={{color: 'red'}}>{errorTasaDesercionCohorte}</p>}
                {!loadingTasaDesercionCohorte && !errorTasaDesercionCohorte && periodosTasaDesercionCohorte.length > 0 && (
                  <div style={{marginTop: 20}}>
                    <div style={{display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="cohorteTasaDesercionCohorte" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Cohorte:
                        </label>
                        <select 
                          id="cohorteTasaDesercionCohorte" 
                          value={cohorteSeleccionada} 
                          onChange={handleCohorteChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #17a2b8',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '150px'
                          }}
                        >
                          <option value="">-- Seleccionar cohorte --</option>
                          {periodosTasaDesercionCohorte.map((periodo) => (
                            <option key={periodo} value={periodo}>{periodo}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="periodoTasaDesercionCohorte" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Semestre:
                        </label>
                        <select 
                          id="periodoTasaDesercionCohorte" 
                          value={periodoSeleccionadoCohorte} 
                          onChange={handlePeriodoCohorteChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #17a2b8',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '150px'
                          }}
                        >
                          <option value="">-- Seleccionar semestre --</option>
                          {periodosCohorteTodos.map((periodo) => (
                            <option key={periodo} value={periodo}>{periodo}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="programaTasaDesercionCohorte" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Programa:
                        </label>
                        <select 
                          id="programaTasaDesercionCohorte" 
                          value={programaSeleccionadoCohorte} 
                          onChange={handleProgramaCohorteChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #17a2b8',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '250px'
                          }}
                        >
                          <option value="">-- Todos --</option>
                          {programasTasaDesercionCohorte.map((programa) => (
                            <option key={programa} value={programa}>{programa}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Sección de cálculo de tasa de deserción por cohorte */}
                    {periodosTasaDesercionCohorte.length > 0 && (
                      renderTasaDesercionCohorteCalculo({
                        cohorteActual: cohorteSeleccionada || (periodosTasaDesercionCohorte.length > 0 ? periodosTasaDesercionCohorte[0] : ''),
                        programaActual: programaSeleccionadoCohorte || '',
                        semestreActual: periodoSeleccionadoCohorte || '',
                        onActualizar: () => {
                          const cohorteActual = cohorteSeleccionada || (periodosTasaDesercionCohorte.length > 0 ? periodosTasaDesercionCohorte[0] : '');
                          const programaActual = programaSeleccionadoCohorte || '';
                          const semestreActual = periodoSeleccionadoCohorte || '';
                          calcularTasaDesercionCohorte(token, cohorteActual, programaActual, semestreActual);
                        }
                      })
                    )}
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos' && graficoSeccion === 'matriculas' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficos.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#0d47a1'}}>Filtros:</span>
                      {filtrosGraficos
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e3f2fd',
                              color: '#0d47a1',
                              border: '1px solid #90caf9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficos.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setPeriodoGraficoSeleccionado(null);
                            setFacultadGraficoSeleccionada(null);
                            setProgramaGraficoSeleccionado(null);
                            setNivelGraficoSeleccionado(null);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoGraficoSeleccionado(null); setFacultadGraficoSeleccionada(null); setProgramaGraficoSeleccionado(null); setNivelGraficoSeleccionado(null); } }}
                          style={{
                            fontSize: 12,
                            color: '#1565c0',
                            textDecoration: 'underline',
                            cursor: 'pointer'
                          }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
                {/* Título de la primera gráfica (por periodo) */}
                <h2>{'Matrículas por Período' + `${facultadGraficoSeleccionada ? ' - ' + facultadGraficoSeleccionada : ''}` + `${programaGraficoSeleccionado ? ' - ' + programaGraficoSeleccionado : ''}` + `${nivelGraficoSeleccionado ? ' - Nivel ' + nivelGraficoSeleccionado : ''}`}</h2>
                {!loadingEstadistica && !errorEstadistica && estadistica.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadistica.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> matrículas
                  </p>
                )}
                {loadingEstadistica && <p>Cargando gráfico...</p>}
                {errorEstadistica && <p style={{color: 'red'}}>{errorEstadistica}</p>}
                {!loadingEstadistica && !errorEstadistica && estadistica.length > 0 && (
                  <div ref={graficoMatriculasPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, estadistica.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={estadistica} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarPeriodoClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="NombrePeriodo" angle={-45} textAnchor="end" height={70} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} name=" "
                            fill="#1976d2"
                            {
                              ...(periodoGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.NombrePeriodo === periodoGraficoSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#1976d2', '#ff9800', abrirModalMatriculasGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingEstadistica && !errorEstadistica && estadistica.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}
                {/* Título de la segunda gráfica (por facultad) */}
                <h2 style={{marginTop: 0}}>
                  {'Matrículas por Facultad' + `${periodoGraficoSeleccionado ? ' - ' + periodoGraficoSeleccionado : ''}` + `${programaGraficoSeleccionado ? ' - ' + programaGraficoSeleccionado : ''}` + `${nivelGraficoSeleccionado ? ' - Nivel ' + nivelGraficoSeleccionado : ''}`}
                </h2>
                {!((periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado ? loadingFacultad : loadingFacultadTotal)) && !((periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado ? errorFacultad : errorFacultadTotal)) && ((periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado) ? estadisticaFacultad : estadisticaFacultadTotal || []).length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{((periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado) ? estadisticaFacultad : estadisticaFacultadTotal || []).reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> matrículas
                  </p>
                )}
                {(periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado ? loadingFacultad : loadingFacultadTotal) && <p>Cargando gráfico...</p>}
                {(periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado ? errorFacultad : errorFacultadTotal) && <p style={{color: 'red'}}>{periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado ? errorFacultad : errorFacultadTotal}</p>}
                {!((periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado ? loadingFacultad : loadingFacultadTotal)) && !((periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado ? errorFacultad : errorFacultadTotal)) && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, ((periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado) ? estadisticaFacultad : estadisticaFacultadTotal || []).length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, ((periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado) ? estadisticaFacultad : estadisticaFacultadTotal || []).length * 36)}>
                        <BarChart layout="vertical" data={(periodoGraficoSeleccionado || programaGraficoSeleccionado || nivelGraficoSeleccionado) ? estadisticaFacultad : estadisticaFacultadTotal} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} name=" "
                            fill="#43a047"
                            {
                              ...(facultadGraficoSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadGraficoSeleccionada;
                                  return renderBarConVerDatos(props, isSelected, '#43a047', '#ff9800', abrirModalMatriculasGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {/* Título de la tercera gráfica (por programa) */}
                <h2 style={{marginTop: 40}}>
                {'Matrículas por Programa' + `${periodoGraficoSeleccionado ? ' - ' + periodoGraficoSeleccionado : ''}` + `${facultadGraficoSeleccionada ? ' - ' + facultadGraficoSeleccionada : ''}` + `${nivelGraficoSeleccionado ? ' - Nivel ' + nivelGraficoSeleccionado : ''}`}
                </h2>
                {!((periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado ? loadingPrograma : loadingProgramaTotal)) && !((periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado ? errorPrograma : errorProgramaTotal)) && ((periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado) ? estadisticaPrograma : estadisticaProgramaTotal || []).length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{((periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado) ? estadisticaPrograma : estadisticaProgramaTotal || []).reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> matrículas
                  </p>
                )}
                {(periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado ? loadingPrograma : loadingProgramaTotal) && <p>Cargando gráfico...</p>}
                {(periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado ? errorPrograma : errorProgramaTotal) && <p style={{color: 'red'}}>{periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado ? errorPrograma : errorProgramaTotal}</p>}
                {!((periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado ? loadingPrograma : loadingProgramaTotal)) && !((periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado ? errorPrograma : errorProgramaTotal)) && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 1000, minHeight: Math.max(250, ((periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado) ? estadisticaPrograma : estadisticaProgramaTotal || []).length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, ((periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado) ? estadisticaPrograma : estadisticaProgramaTotal || []).length * 36)}>
                        <BarChart layout="vertical" data={(periodoGraficoSeleccionado || facultadGraficoSeleccionada || nivelGraficoSeleccionado) ? estadisticaPrograma : estadisticaProgramaTotal} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 11 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} fill="#fbc02d" name=" "
                            {
                              ...(programaGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaGraficoSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#fbc02d', '#ff9800', abrirModalMatriculasGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingProgramaTotal && !errorProgramaTotal && (periodoGraficoSeleccionado ? estadisticaPrograma.length === 0 : estadisticaProgramaTotal.length === 0) && (
                  <p>No hay datos para mostrar.</p>
                )}
                {/* Título de la cuarta gráfica (por nivel) */}
                <h2 style={{marginTop: 40}}>
                  {'Matrículas por Nivel ' + `${periodoGraficoSeleccionado ? ' - ' + periodoGraficoSeleccionado : ''}` + `${facultadGraficoSeleccionada ? ' - ' + facultadGraficoSeleccionada : ''}` + `${programaGraficoSeleccionado ? ' - ' + programaGraficoSeleccionado : ''}`}
                </h2>
                {!(periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado ? loadingNivel : loadingNivelTotal) && !(periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado ? errorNivel : errorNivelTotal) && (periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado ? estadisticaNivel : estadisticaNivelTotal || []).length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{(periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado ? estadisticaNivel : estadisticaNivelTotal || []).reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> matrículas
                  </p>
                )}
                {(periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado ? loadingNivel : loadingNivelTotal) && <p>Cargando gráfico...</p>}
                {(periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado ? errorNivel : errorNivelTotal) && <p style={{color: 'red'}}>{periodoGraficoSeleccionado || facultadGraficoSeleccionada ? errorNivel : errorNivelTotal}</p>}
                {!(periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado? loadingNivel : loadingNivelTotal) && !(periodoGraficoSeleccionado || facultadGraficoSeleccionada ? errorNivel : errorNivelTotal) && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(600, (periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado? estadisticaNivel : estadisticaNivelTotal || []).length * 50), height: 300}}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={periodoGraficoSeleccionado || facultadGraficoSeleccionada || programaGraficoSeleccionado? estadisticaNivel : estadisticaNivelTotal} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-20} textAnchor="end" height={60} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} fill="#8e24aa" name=" "
                            {
                              ...(nivelGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.nivel === nivelGraficoSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#8e24aa', '#ff9800', abrirModalMatriculasGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!(periodoGraficoSeleccionado || facultadGraficoSeleccionada ? loadingNivel : loadingNivelTotal) && !(periodoGraficoSeleccionado || facultadGraficoSeleccionada ? errorNivel : errorNivelTotal) && (periodoGraficoSeleccionado || facultadGraficoSeleccionada ? estadisticaNivel.length === 0 : estadisticaNivelTotal.length === 0) && (
                  <p>No hay datos para mostrar.</p>
                )}
              </div>
            )}
            {vista === 'graficos' && graficoSeccion === 'desercion' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosDesercion.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#b71c1c'}}>Filtros:</span>
                      {filtrosGraficosDesercion
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#fdecea',
                              color: '#b71c1c',
                              border: '1px solid #ffcdd2',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosDesercion.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoGraficoDesercionSeleccionado(null); setFacultadGraficoDesercionSeleccionada(null); setProgramaGraficoDesercionSeleccionado(null); setNivelGraficoDesercionSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoGraficoDesercionSeleccionado(null); setFacultadGraficoDesercionSeleccionada(null); setProgramaGraficoDesercionSeleccionado(null); setNivelGraficoDesercionSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#c62828', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
                <h2>{'Deserción por Período' + `${facultadGraficoDesercionSeleccionada ? ' - ' + facultadGraficoDesercionSeleccionada : ''}` + `${programaGraficoDesercionSeleccionado ? ' - ' + programaGraficoDesercionSeleccionado : ''}` + `${nivelGraficoDesercionSeleccionado ? ' - Nivel ' + nivelGraficoDesercionSeleccionado : ''}`}</h2>
                {!loadingDesercionPeriodo && !errorDesercionPeriodo && estadisticaDesercionPeriodo.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaDesercionPeriodo.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> desertores
                  </p>
                )}
                {loadingDesercionPeriodo && <p>Cargando gráfico...</p>}
                {errorDesercionPeriodo && <p style={{color: 'red'}}>{errorDesercionPeriodo}</p>}
                {!loadingDesercionPeriodo && !errorDesercionPeriodo && estadisticaDesercionPeriodo.length > 0 && (
                  <div ref={graficoDesercionPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, estadisticaDesercionPeriodo.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={estadisticaDesercionPeriodo} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarDesercionPeriodoClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} name=" "
                            fill="#c62828"
                            {
                              ...(periodoGraficoDesercionSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.periodo === periodoGraficoDesercionSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#c62828', '#ff9800', abrirModalDesercionGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingDesercionPeriodo && !errorDesercionPeriodo && estadisticaDesercionPeriodo.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}
                <h2 style={{marginTop: 0}}>
                  {'Deserción por Facultad' + `${periodoGraficoDesercionSeleccionado ? ' - ' + periodoGraficoDesercionSeleccionado : ''}` + `${programaGraficoDesercionSeleccionado ? ' - ' + programaGraficoDesercionSeleccionado : ''}` + `${nivelGraficoDesercionSeleccionado ? ' - Nivel ' + nivelGraficoDesercionSeleccionado : ''}`}
                </h2>
                {!loadingDesercionFacultad && !errorDesercionFacultad && estadisticaDesercionFacultad.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaDesercionFacultad.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> desertores
                  </p>
                )}
                {loadingDesercionFacultad && <p>Cargando gráfico...</p>}
                {errorDesercionFacultad && <p style={{color: 'red'}}>{errorDesercionFacultad}</p>}
                {!loadingDesercionFacultad && !errorDesercionFacultad && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, estadisticaDesercionFacultad.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, estadisticaDesercionFacultad.length * 36)}>
                        <BarChart layout="vertical" data={estadisticaDesercionFacultad} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarDesercionFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} name=" "
                            fill="#6a1b9a"
                            {
                              ...(facultadGraficoDesercionSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadGraficoDesercionSeleccionada;
                                  return renderBarConVerDatos(props, isSelected, '#6a1b9a', '#ff9800', abrirModalDesercionGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <h2 style={{marginTop: 40}}>
                  {'Deserción por Programa' + `${periodoGraficoDesercionSeleccionado ? ' - ' + periodoGraficoDesercionSeleccionado : ''}` + `${facultadGraficoDesercionSeleccionada ? ' - ' + facultadGraficoDesercionSeleccionada : ''}` + `${nivelGraficoDesercionSeleccionado ? ' - Nivel ' + nivelGraficoDesercionSeleccionado : ''}`}
                </h2>
                {!loadingDesercionPrograma && !errorDesercionPrograma && estadisticaDesercionPrograma.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaDesercionPrograma.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> desertores
                  </p>
                )}
                {loadingDesercionPrograma && <p>Cargando gráfico...</p>}
                {errorDesercionPrograma && <p style={{color: 'red'}}>{errorDesercionPrograma}</p>}
                {!loadingDesercionPrograma && !errorDesercionPrograma && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 1000, minHeight: Math.max(250, estadisticaDesercionPrograma.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, estadisticaDesercionPrograma.length * 36)}>
                        <BarChart layout="vertical" data={estadisticaDesercionPrograma} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarDesercionProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 11 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} fill="#ef6c00" name=" "
                            {
                              ...(programaGraficoDesercionSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaGraficoDesercionSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#ef6c00', '#ff9800', abrirModalDesercionGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <h2 style={{marginTop: 40}}>
                  {'Deserción por Nivel ' + `${periodoGraficoDesercionSeleccionado ? ' - ' + periodoGraficoDesercionSeleccionado : ''}` + `${facultadGraficoDesercionSeleccionada ? ' - ' + facultadGraficoDesercionSeleccionada : ''}` + `${programaGraficoDesercionSeleccionado ? ' - ' + programaGraficoDesercionSeleccionado : ''}`}
                </h2>
                {!loadingDesercionNivel && !errorDesercionNivel && estadisticaDesercionNivel.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaDesercionNivel.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> desertores
                  </p>
                )}
                {loadingDesercionNivel && <p>Cargando gráfico...</p>}
                {errorDesercionNivel && <p style={{color: 'red'}}>{errorDesercionNivel}</p>}
                {!loadingDesercionNivel && !errorDesercionNivel && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(600, estadisticaDesercionNivel.length * 50), height: 300}}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={estadisticaDesercionNivel} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarDesercionNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-20} textAnchor="end" height={60} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} fill="#00897b" name=" "
                            {
                              ...(nivelGraficoDesercionSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.nivel === nivelGraficoDesercionSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#00897b', '#ff9800', abrirModalDesercionGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos' && graficoSeccion === 'primiparos' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosPrimiparos.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#006064'}}>Filtros:</span>
                      {filtrosGraficosPrimiparos
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e0f7fa',
                              color: '#006064',
                              border: '1px solid #b2ebf2',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosPrimiparos.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoGraficoPrimiparosSeleccionado(null); setFacultadGraficoPrimiparosSeleccionada(null); setProgramaGraficoPrimiparosSeleccionado(null); setNivelGraficoPrimiparosSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoGraficoPrimiparosSeleccionado(null); setFacultadGraficoPrimiparosSeleccionada(null); setProgramaGraficoPrimiparosSeleccionado(null); setNivelGraficoPrimiparosSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#0097a7', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
                <h2>{'Primíparos por Período' + `${facultadGraficoPrimiparosSeleccionada ? ' - ' + facultadGraficoPrimiparosSeleccionada : ''}` + `${programaGraficoPrimiparosSeleccionado ? ' - ' + programaGraficoPrimiparosSeleccionado : ''}` + `${nivelGraficoPrimiparosSeleccionado ? ' - Nivel ' + nivelGraficoPrimiparosSeleccionado : ''}`}</h2>
                {!loadingPrimiparosPeriodo && !errorPrimiparosPeriodo && estadisticaPrimiparosPeriodo.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaPrimiparosPeriodo.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> primíparos
                  </p>
                )}
                {loadingPrimiparosPeriodo && <p>Cargando gráfico...</p>}
                {errorPrimiparosPeriodo && <p style={{color: 'red'}}>{errorPrimiparosPeriodo}</p>}
                {!loadingPrimiparosPeriodo && !errorPrimiparosPeriodo && estadisticaPrimiparosPeriodo.length > 0 && (
                  <div ref={graficoPrimiparosPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, estadisticaPrimiparosPeriodo.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={estadisticaPrimiparosPeriodo} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarPrimiparosPeriodoClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} name=" "
                            fill="#0097a7"
                            {
                              ...(periodoGraficoPrimiparosSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.periodo === periodoGraficoPrimiparosSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#0097a7', '#ff9800', abrirModalPrimiparosGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingPrimiparosPeriodo && !errorPrimiparosPeriodo && estadisticaPrimiparosPeriodo.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}
                <h2 style={{marginTop: 0}}>
                  {'Primíparos por Facultad' + `${periodoGraficoPrimiparosSeleccionado ? ' - ' + periodoGraficoPrimiparosSeleccionado : ''}` + `${programaGraficoPrimiparosSeleccionado ? ' - ' + programaGraficoPrimiparosSeleccionado : ''}` + `${nivelGraficoPrimiparosSeleccionado ? ' - Nivel ' + nivelGraficoPrimiparosSeleccionado : ''}`}
                </h2>
                {!loadingPrimiparosFacultad && !errorPrimiparosFacultad && estadisticaPrimiparosFacultad.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaPrimiparosFacultad.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> primíparos
                  </p>
                )}
                {loadingPrimiparosFacultad && <p>Cargando gráfico...</p>}
                {errorPrimiparosFacultad && <p style={{color: 'red'}}>{errorPrimiparosFacultad}</p>}
                {!loadingPrimiparosFacultad && !errorPrimiparosFacultad && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, estadisticaPrimiparosFacultad.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, estadisticaPrimiparosFacultad.length * 36)}>
                        <BarChart layout="vertical" data={estadisticaPrimiparosFacultad} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarPrimiparosFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} name=" "
                            fill="#00796b"
                            {
                              ...(facultadGraficoPrimiparosSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadGraficoPrimiparosSeleccionada;
                                  return renderBarConVerDatos(props, isSelected, '#00796b', '#ff9800', abrirModalPrimiparosGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <h2 style={{marginTop: 40}}>
                  {'Primíparos por Programa' + `${periodoGraficoPrimiparosSeleccionado ? ' - ' + periodoGraficoPrimiparosSeleccionado : ''}` + `${facultadGraficoPrimiparosSeleccionada ? ' - ' + facultadGraficoPrimiparosSeleccionada : ''}` + `${nivelGraficoPrimiparosSeleccionado ? ' - Nivel ' + nivelGraficoPrimiparosSeleccionado : ''}`}
                </h2>
                {!loadingPrimiparosPrograma && !errorPrimiparosPrograma && estadisticaPrimiparosPrograma.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaPrimiparosPrograma.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> primíparos
                  </p>
                )}
                {loadingPrimiparosPrograma && <p>Cargando gráfico...</p>}
                {errorPrimiparosPrograma && <p style={{color: 'red'}}>{errorPrimiparosPrograma}</p>}
                {!loadingPrimiparosPrograma && !errorPrimiparosPrograma && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 1000, minHeight: Math.max(250, estadisticaPrimiparosPrograma.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, estadisticaPrimiparosPrograma.length * 36)}>
                        <BarChart layout="vertical" data={estadisticaPrimiparosPrograma} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarPrimiparosProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 11 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} fill="#26a69a" name=" "
                            {
                              ...(programaGraficoPrimiparosSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaGraficoPrimiparosSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#26a69a', '#ff9800', abrirModalPrimiparosGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <h2 style={{marginTop: 40}}>
                  {'Primíparos por Nivel ' + `${periodoGraficoPrimiparosSeleccionado ? ' - ' + periodoGraficoPrimiparosSeleccionado : ''}` + `${facultadGraficoPrimiparosSeleccionada ? ' - ' + facultadGraficoPrimiparosSeleccionada : ''}` + `${programaGraficoPrimiparosSeleccionado ? ' - ' + programaGraficoPrimiparosSeleccionado : ''}`}
                </h2>
                {!loadingPrimiparosNivel && !errorPrimiparosNivel && estadisticaPrimiparosNivel.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaPrimiparosNivel.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> primíparos
                  </p>
                )}
                {loadingPrimiparosNivel && <p>Cargando gráfico...</p>}
                {errorPrimiparosNivel && <p style={{color: 'red'}}>{errorPrimiparosNivel}</p>}
                {!loadingPrimiparosNivel && !errorPrimiparosNivel && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(600, estadisticaPrimiparosNivel.length * 50), height: 300}}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={estadisticaPrimiparosNivel} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarPrimiparosNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-20} textAnchor="end" height={60} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} fill="#00838f" name=" "
                            {
                              ...(nivelGraficoPrimiparosSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.nivel === nivelGraficoPrimiparosSeleccionado;
                              return renderBarConVerDatos(props, isSelected, '#00838f', '#ff9800', abrirModalPrimiparosGraficos);
                            }
                          })
                        }
                      />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos' && graficoSeccion === 'graduados' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosGraduados.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#4527a0'}}>Filtros:</span>
                      {filtrosGraficosGraduados
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#ede7f6',
                              color: '#4527a0',
                              border: '1px solid #d1c4e9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosGraduados.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoGraficoGraduadosSeleccionado(null); setFacultadGraficoGraduadosSeleccionada(null); setProgramaGraficoGraduadosSeleccionado(null); setNivelGraficoGraduadosSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoGraficoGraduadosSeleccionado(null); setFacultadGraficoGraduadosSeleccionada(null); setProgramaGraficoGraduadosSeleccionado(null); setNivelGraficoGraduadosSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#5e35b1', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
                <h2>{'Graduados por Período' + `${facultadGraficoGraduadosSeleccionada ? ' - ' + facultadGraficoGraduadosSeleccionada : ''}` + `${programaGraficoGraduadosSeleccionado ? ' - ' + programaGraficoGraduadosSeleccionado : ''}` + `${nivelGraficoGraduadosSeleccionado ? ' - Nivel ' + nivelGraficoGraduadosSeleccionado : ''}`}</h2>
                {!loadingGraduadosPeriodo && !errorGraduadosPeriodo && estadisticaGraduadosPeriodo.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaGraduadosPeriodo.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> graduados
                  </p>
                )}
                {loadingGraduadosPeriodo && <p>Cargando gráfico...</p>}
                {errorGraduadosPeriodo && <p style={{color: 'red'}}>{errorGraduadosPeriodo}</p>}
                {!loadingGraduadosPeriodo && !errorGraduadosPeriodo && estadisticaGraduadosPeriodo.length > 0 && (
                  <div ref={graficoGraduadosPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, estadisticaGraduadosPeriodo.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={estadisticaGraduadosPeriodo} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarGraduadosPeriodoClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} name=" "
                            fill="#5e35b1"
                            {
                              ...(periodoGraficoGraduadosSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.periodo === periodoGraficoGraduadosSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#5e35b1', '#ff9800', abrirModalGraduadosGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingGraduadosPeriodo && !errorGraduadosPeriodo && estadisticaGraduadosPeriodo.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}
                <h2 style={{marginTop: 0}}>
                  {'Graduados por Facultad' + `${periodoGraficoGraduadosSeleccionado ? ' - ' + periodoGraficoGraduadosSeleccionado : ''}` + `${programaGraficoGraduadosSeleccionado ? ' - ' + programaGraficoGraduadosSeleccionado : ''}` + `${nivelGraficoGraduadosSeleccionado ? ' - Nivel ' + nivelGraficoGraduadosSeleccionado : ''}`}
                </h2>
                {!loadingGraduadosFacultad && !errorGraduadosFacultad && estadisticaGraduadosFacultad.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaGraduadosFacultad.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> graduados
                  </p>
                )}
                {loadingGraduadosFacultad && <p>Cargando gráfico...</p>}
                {errorGraduadosFacultad && <p style={{color: 'red'}}>{errorGraduadosFacultad}</p>}
                {!loadingGraduadosFacultad && !errorGraduadosFacultad && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, estadisticaGraduadosFacultad.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, estadisticaGraduadosFacultad.length * 36)}>
                        <BarChart layout="vertical" data={estadisticaGraduadosFacultad} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarGraduadosFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} name=" "
                            fill="#6a1b9a"
                            {
                              ...(facultadGraficoGraduadosSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadGraficoGraduadosSeleccionada;
                                  return renderBarConVerDatos(props, isSelected, '#6a1b9a', '#ff9800', abrirModalGraduadosGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <h2 style={{marginTop: 40}}>
                  {'Graduados por Programa' + `${periodoGraficoGraduadosSeleccionado ? ' - ' + periodoGraficoGraduadosSeleccionado : ''}` + `${facultadGraficoGraduadosSeleccionada ? ' - ' + facultadGraficoGraduadosSeleccionada : ''}` + `${nivelGraficoGraduadosSeleccionado ? ' - Nivel ' + nivelGraficoGraduadosSeleccionado : ''}`}
                </h2>
                {!loadingGraduadosPrograma && !errorGraduadosPrograma && estadisticaGraduadosPrograma.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaGraduadosPrograma.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> graduados
                  </p>
                )}
                {loadingGraduadosPrograma && <p>Cargando gráfico...</p>}
                {errorGraduadosPrograma && <p style={{color: 'red'}}>{errorGraduadosPrograma}</p>}
                {!loadingGraduadosPrograma && !errorGraduadosPrograma && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 1000, minHeight: Math.max(250, estadisticaGraduadosPrograma.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, estadisticaGraduadosPrograma.length * 36)}>
                        <BarChart layout="vertical" data={estadisticaGraduadosPrograma} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarGraduadosProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 11 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} fill="#7e57c2" name=" "
                            {
                              ...(programaGraficoGraduadosSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaGraficoGraduadosSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#7e57c2', '#ff9800', abrirModalGraduadosGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <h2 style={{marginTop: 40}}>
                  {'Graduados por Nivel ' + `${periodoGraficoGraduadosSeleccionado ? ' - ' + periodoGraficoGraduadosSeleccionado : ''}` + `${facultadGraficoGraduadosSeleccionada ? ' - ' + facultadGraficoGraduadosSeleccionada : ''}` + `${programaGraficoGraduadosSeleccionado ? ' - ' + programaGraficoGraduadosSeleccionado : ''}`}
                </h2>
                {!loadingGraduadosNivel && !errorGraduadosNivel && estadisticaGraduadosNivel.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaGraduadosNivel.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> graduados
                  </p>
                )}
                {loadingGraduadosNivel && <p>Cargando gráfico...</p>}
                {errorGraduadosNivel && <p style={{color: 'red'}}>{errorGraduadosNivel}</p>}
                {!loadingGraduadosNivel && !errorGraduadosNivel && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(600, estadisticaGraduadosNivel.length * 50), height: 300}}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={estadisticaGraduadosNivel} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarGraduadosNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-20} textAnchor="end" height={60} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} fill="#9575cd" name=" "
                            {
                              ...(nivelGraficoGraduadosSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.nivel === nivelGraficoGraduadosSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#9575cd', '#ff9800', abrirModalGraduadosGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos' && graficoSeccion === 'ausencia-intersemestral' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosAusencia.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#e65100'}}>Filtros:</span>
                      {filtrosGraficosAusencia
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#fff3e0',
                              color: '#e65100',
                              border: '1px solid #ffe0b2',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosAusencia.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoGraficoAusenciaSeleccionado(null); setFacultadGraficoAusenciaSeleccionada(null); setProgramaGraficoAusenciaSeleccionado(null); setNivelGraficoAusenciaSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoGraficoAusenciaSeleccionado(null); setFacultadGraficoAusenciaSeleccionada(null); setProgramaGraficoAusenciaSeleccionado(null); setNivelGraficoAusenciaSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#ef6c00', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
                <h2>{'Ausencia intersemestral por Período' + `${facultadGraficoAusenciaSeleccionada ? ' - ' + facultadGraficoAusenciaSeleccionada : ''}` + `${programaGraficoAusenciaSeleccionado ? ' - ' + programaGraficoAusenciaSeleccionado : ''}` + `${nivelGraficoAusenciaSeleccionado ? ' - Nivel ' + nivelGraficoAusenciaSeleccionado : ''}`}</h2>
                {!loadingAusenciaPeriodo && !errorAusenciaPeriodo && estadisticaAusenciaPeriodo.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaAusenciaPeriodo.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> ausencias
                  </p>
                )}
                {loadingAusenciaPeriodo && <p>Cargando gráfico...</p>}
                {errorAusenciaPeriodo && <p style={{color: 'red'}}>{errorAusenciaPeriodo}</p>}
                {!loadingAusenciaPeriodo && !errorAusenciaPeriodo && estadisticaAusenciaPeriodo.length > 0 && (
                  <div ref={graficoAusenciaPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, estadisticaAusenciaPeriodo.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={estadisticaAusenciaPeriodo} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarAusenciaPeriodoClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'top' }} name=" "
                            fill="#ef6c00"
                            {
                              ...(periodoGraficoAusenciaSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.periodo === periodoGraficoAusenciaSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#ef6c00', '#ff9800', abrirModalAusenciaGraficos);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingAusenciaPeriodo && !errorAusenciaPeriodo && estadisticaAusenciaPeriodo.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}
                <h2 style={{marginTop: 0}}>
                  {'Ausencia intersemestral por Facultad' + `${periodoGraficoAusenciaSeleccionado ? ' - ' + periodoGraficoAusenciaSeleccionado : ''}` + `${programaGraficoAusenciaSeleccionado ? ' - ' + programaGraficoAusenciaSeleccionado : ''}` + `${nivelGraficoAusenciaSeleccionado ? ' - Nivel ' + nivelGraficoAusenciaSeleccionado : ''}`}
                </h2>
                {!loadingAusenciaFacultad && !errorAusenciaFacultad && estadisticaAusenciaFacultad.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaAusenciaFacultad.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> ausencias
                  </p>
                )}
                {loadingAusenciaFacultad && <p>Cargando gráfico...</p>}
                {errorAusenciaFacultad && <p style={{color: 'red'}}>{errorAusenciaFacultad}</p>}
                {!loadingAusenciaFacultad && !errorAusenciaFacultad && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, estadisticaAusenciaFacultad.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, estadisticaAusenciaFacultad.length * 36)}>
                        <BarChart layout="vertical" data={estadisticaAusenciaFacultad} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarAusenciaFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} name=" "
                            fill="#f57c00"
                            {
                              ...(facultadGraficoAusenciaSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadGraficoAusenciaSeleccionada;
                              return renderBarConVerDatos(props, isSelected, '#f57c00', '#ff9800', abrirModalAusenciaGraficos);
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <h2 style={{marginTop: 40}}>
                  {'Ausencia intersemestral por Programa' + `${periodoGraficoAusenciaSeleccionado ? ' - ' + periodoGraficoAusenciaSeleccionado : ''}` + `${facultadGraficoAusenciaSeleccionada ? ' - ' + facultadGraficoAusenciaSeleccionada : ''}` + `${nivelGraficoAusenciaSeleccionado ? ' - Nivel ' + nivelGraficoAusenciaSeleccionado : ''}`}
                </h2>
                {!loadingAusenciaPrograma && !errorAusenciaPrograma && estadisticaAusenciaPrograma.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaAusenciaPrograma.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> ausencias
                  </p>
                )}
                {loadingAusenciaPrograma && <p>Cargando gráfico...</p>}
                {errorAusenciaPrograma && <p style={{color: 'red'}}>{errorAusenciaPrograma}</p>}
                {!loadingAusenciaPrograma && !errorAusenciaPrograma && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, estadisticaAusenciaPrograma.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, estadisticaAusenciaPrograma.length * 36)}>
                        <BarChart layout="vertical" data={estadisticaAusenciaPrograma} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarAusenciaProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="cantidad" label={{ position: 'right' }} fill="#fb8c00" name=" "
                        {
                          ...(programaGraficoAusenciaSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.programa === programaGraficoAusenciaSeleccionado;
                              return renderBarConVerDatos(props, isSelected, '#fb8c00', '#ff9800', abrirModalAusenciaGraficos);
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <h2 style={{marginTop: 40}}>
                  {'Ausencia intersemestral por Nivel ' + `${periodoGraficoAusenciaSeleccionado ? ' - ' + periodoGraficoAusenciaSeleccionado : ''}` + `${facultadGraficoAusenciaSeleccionada ? ' - ' + facultadGraficoAusenciaSeleccionada : ''}` + `${programaGraficoAusenciaSeleccionado ? ' - ' + programaGraficoAusenciaSeleccionado : ''}`}
                </h2>
                {!loadingAusenciaNivel && !errorAusenciaNivel && estadisticaAusenciaNivel.length > 0 && (
                  <p style={{marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 500}}>
                    Suma total: <strong>{estadisticaAusenciaNivel.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0).toLocaleString('es')}</strong> ausencias
                  </p>
                )}
                {loadingAusenciaNivel && <p>Cargando gráfico...</p>}
                {errorAusenciaNivel && <p style={{color: 'red'}}>{errorAusenciaNivel}</p>}
                {!loadingAusenciaNivel && !errorAusenciaNivel && estadisticaAusenciaNivel.length > 0 && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, estadisticaAusenciaNivel.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={estadisticaAusenciaNivel} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarAusenciaNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="cantidad" label={{ position: 'top' }} fill="#ff9800" name=" "
                        {
                          ...(nivelGraficoAusenciaSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.nivel === nivelGraficoAusenciaSeleccionado;
                              return renderBarConVerDatos(props, isSelected, '#ff9800', '#ffb74d', abrirModalAusenciaGraficos);
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos' && graficoSeccion !== 'matriculas' && graficoSeccion !== 'desercion' && graficoSeccion !== 'primiparos' && graficoSeccion !== 'graduados' && graficoSeccion !== 'ausencia-intersemestral' && (
              <div style={{padding: 20}}>
                <p style={{color: '#6c757d'}}>Los gráficos de {graficoSeccionLabel} estarán disponibles próximamente.</p>
              </div>
            )}
            {vista === 'graficos-tasa-desercion' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosTasaDesercion.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#1b5e20'}}>Filtros:</span>
                      {filtrosGraficosTasaDesercion
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e8f5e9',
                              color: '#1b5e20',
                              border: '1px solid #c8e6c9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosTasaDesercion.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoTasaDesercionGraficoSeleccionado(null); setFacultadTasaDesercionGraficoSeleccionada(null); setProgramaTasaDesercionGraficoSeleccionado(null); setNivelTasaDesercionGraficoSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoTasaDesercionGraficoSeleccionado(null); setFacultadTasaDesercionGraficoSeleccionada(null); setProgramaTasaDesercionGraficoSeleccionado(null); setNivelTasaDesercionGraficoSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#2e7d32', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>

                <h2>{'Tasa de deserción anual por Período' + `${facultadTasaDesercionGraficoSeleccionada ? ' - ' + facultadTasaDesercionGraficoSeleccionada : ''}` + `${programaTasaDesercionGraficoSeleccionado ? ' - ' + programaTasaDesercionGraficoSeleccionado : ''}` + `${nivelTasaDesercionGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionGraficoSeleccionado : ''}`}</h2>
                {loadingTasaDesercionPeriodoGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionPeriodoGrafico && <p style={{color: 'red'}}>{errorTasaDesercionPeriodoGrafico}</p>}
                {!loadingTasaDesercionPeriodoGrafico && !errorTasaDesercionPeriodoGrafico && tasaDesercionPeriodoGrafico.length > 0 && (
                  <div ref={graficoTasaDesercionPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaDesercionPeriodoGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaDesercionPeriodoGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaDesercionPeriodoClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                          <YAxis allowDecimals />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'top' }} fill="#2e7d32" name=" "
                            {
                              ...(periodoTasaDesercionGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.periodo === periodoTasaDesercionGraficoSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#2e7d32', '#ff9800', abrirModalTasaDesercionGrafico);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingTasaDesercionPeriodoGrafico && !errorTasaDesercionPeriodoGrafico && tasaDesercionPeriodoGrafico.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}

                <h2 style={{marginTop: 0}}>
                  {'Tasa de deserción anual por Facultad' + `${periodoTasaDesercionGraficoSeleccionado ? ' - ' + periodoTasaDesercionGraficoSeleccionado : ''}` + `${programaTasaDesercionGraficoSeleccionado ? ' - ' + programaTasaDesercionGraficoSeleccionado : ''}` + `${nivelTasaDesercionGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionFacultadGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionFacultadGrafico && <p style={{color: 'red'}}>{errorTasaDesercionFacultadGrafico}</p>}
                {!loadingTasaDesercionFacultadGrafico && !errorTasaDesercionFacultadGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaDesercionFacultadGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaDesercionFacultadGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaDesercionFacultadGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaDesercionFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#388e3c" name=" "
                            {
                              ...(facultadTasaDesercionGraficoSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadTasaDesercionGraficoSeleccionada;
                                  return renderBarConVerDatos(props, isSelected, '#388e3c', '#ff9800', abrirModalTasaDesercionGrafico);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de deserción anual por Programa' + `${periodoTasaDesercionGraficoSeleccionado ? ' - ' + periodoTasaDesercionGraficoSeleccionado : ''}` + `${facultadTasaDesercionGraficoSeleccionada ? ' - ' + facultadTasaDesercionGraficoSeleccionada : ''}` + `${nivelTasaDesercionGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionProgramaGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionProgramaGrafico && <p style={{color: 'red'}}>{errorTasaDesercionProgramaGrafico}</p>}
                {!loadingTasaDesercionProgramaGrafico && !errorTasaDesercionProgramaGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaDesercionProgramaGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaDesercionProgramaGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaDesercionProgramaGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaDesercionProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#43a047" name=" "
                            {
                              ...(programaTasaDesercionGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaTasaDesercionGraficoSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#43a047', '#ff9800', abrirModalTasaDesercionGrafico);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de deserción anual por Nivel ' + `${periodoTasaDesercionGraficoSeleccionado ? ' - ' + periodoTasaDesercionGraficoSeleccionado : ''}` + `${facultadTasaDesercionGraficoSeleccionada ? ' - ' + facultadTasaDesercionGraficoSeleccionada : ''}` + `${programaTasaDesercionGraficoSeleccionado ? ' - ' + programaTasaDesercionGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionNivelGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionNivelGrafico && <p style={{color: 'red'}}>{errorTasaDesercionNivelGrafico}</p>}
                {!loadingTasaDesercionNivelGrafico && !errorTasaDesercionNivelGrafico && tasaDesercionNivelOrdenado.length > 0 && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaDesercionNivelOrdenado.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaDesercionNivelOrdenado} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaDesercionNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-45} textAnchor="end" height={70} interval={0} />
                          <YAxis allowDecimals />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'top' }} fill="#66bb6a" name=" "
                            {
                              ...(nivelTasaDesercionGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.nivel === nivelTasaDesercionGraficoSeleccionado;
                                  return renderBarConVerDatos(props, isSelected, '#66bb6a', '#ff9800', abrirModalTasaDesercionGrafico);
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos-tasa-desercion-cohorte' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosTasaDesercionCohorte.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#1b5e20'}}>Filtros:</span>
                      {filtrosGraficosTasaDesercionCohorte
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e8f5e9',
                              color: '#1b5e20',
                              border: '1px solid #c8e6c9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosTasaDesercionCohorte.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoTasaDesercionCohorteGraficoSeleccionado(null); setFacultadTasaDesercionCohorteGraficoSeleccionada(null); setProgramaTasaDesercionCohorteGraficoSeleccionado(null); setNivelTasaDesercionCohorteGraficoSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoTasaDesercionCohorteGraficoSeleccionado(null); setFacultadTasaDesercionCohorteGraficoSeleccionada(null); setProgramaTasaDesercionCohorteGraficoSeleccionado(null); setNivelTasaDesercionCohorteGraficoSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#2e7d32', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>

                <h2>{'Tasa de Deserción por Cohorte por Periodo' + `${facultadTasaDesercionCohorteGraficoSeleccionada ? ' - ' + facultadTasaDesercionCohorteGraficoSeleccionada : ''}` + `${programaTasaDesercionCohorteGraficoSeleccionado ? ' - ' + programaTasaDesercionCohorteGraficoSeleccionado : ''}` + `${nivelTasaDesercionCohorteGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionCohorteGraficoSeleccionado : ''}`}</h2>
                {loadingTasaDesercionCohortePeriodoGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionCohortePeriodoGrafico && <p style={{color: 'red'}}>{errorTasaDesercionCohortePeriodoGrafico}</p>}
                {!loadingTasaDesercionCohortePeriodoGrafico && !errorTasaDesercionCohortePeriodoGrafico && tasaDesercionCohortePeriodoGrafico.length > 0 && (
                  <div ref={graficoTasaDesercionCohortePeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaDesercionCohortePeriodoGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaDesercionCohortePeriodoGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaDesercionCohortePeriodoClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                          <YAxis allowDecimals />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'top' }} fill="#2e7d32" name=" "
                            {
                              ...(periodoTasaDesercionCohorteGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.periodo === periodoTasaDesercionCohorteGraficoSeleccionado;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#2e7d32',
                                    '#ff9800',
                                    () => abrirModalTasaDesercionCohorteGrafico({ cohorte: payload.periodo }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingTasaDesercionCohortePeriodoGrafico && !errorTasaDesercionCohortePeriodoGrafico && tasaDesercionCohortePeriodoGrafico.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}

                <h2 style={{marginTop: 0}}>
                  {'Tasa de Deserción por Cohorte por Facultad' + `${periodoTasaDesercionCohorteGraficoSeleccionado ? ' - ' + periodoTasaDesercionCohorteGraficoSeleccionado : ''}` + `${programaTasaDesercionCohorteGraficoSeleccionado ? ' - ' + programaTasaDesercionCohorteGraficoSeleccionado : ''}` + `${nivelTasaDesercionCohorteGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionCohorteGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionCohorteFacultadGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionCohorteFacultadGrafico && <p style={{color: 'red'}}>{errorTasaDesercionCohorteFacultadGrafico}</p>}
                {!loadingTasaDesercionCohorteFacultadGrafico && !errorTasaDesercionCohorteFacultadGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaDesercionCohorteFacultadGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaDesercionCohorteFacultadGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaDesercionCohorteFacultadGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaDesercionCohorteFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#388e3c" name=" "
                            {
                              ...(facultadTasaDesercionCohorteGraficoSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadTasaDesercionCohorteGraficoSeleccionada;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#388e3c',
                                    '#ff9800',
                                    () => abrirModalTasaDesercionCohorteGrafico({ facultad: payload.facultad }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Deserción por Cohorte por Programa' + `${periodoTasaDesercionCohorteGraficoSeleccionado ? ' - ' + periodoTasaDesercionCohorteGraficoSeleccionado : ''}` + `${facultadTasaDesercionCohorteGraficoSeleccionada ? ' - ' + facultadTasaDesercionCohorteGraficoSeleccionada : ''}` + `${nivelTasaDesercionCohorteGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionCohorteGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionCohorteProgramaGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionCohorteProgramaGrafico && <p style={{color: 'red'}}>{errorTasaDesercionCohorteProgramaGrafico}</p>}
                {!loadingTasaDesercionCohorteProgramaGrafico && !errorTasaDesercionCohorteProgramaGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaDesercionCohorteProgramaGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaDesercionCohorteProgramaGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaDesercionCohorteProgramaGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaDesercionCohorteProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#43a047" name=" "
                            {
                              ...(programaTasaDesercionCohorteGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaTasaDesercionCohorteGraficoSeleccionado;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#43a047',
                                    '#ff9800',
                                    () => abrirModalTasaDesercionCohorteGrafico({ programa: payload.programa }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Deserción por Cohorte por Nivel' + `${periodoTasaDesercionCohorteGraficoSeleccionado ? ' - ' + periodoTasaDesercionCohorteGraficoSeleccionado : ''}` + `${facultadTasaDesercionCohorteGraficoSeleccionada ? ' - ' + facultadTasaDesercionCohorteGraficoSeleccionada : ''}` + `${programaTasaDesercionCohorteGraficoSeleccionado ? ' - ' + programaTasaDesercionCohorteGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionCohorteNivelGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionCohorteNivelGrafico && <p style={{color: 'red'}}>{errorTasaDesercionCohorteNivelGrafico}</p>}
                {!loadingTasaDesercionCohorteNivelGrafico && !errorTasaDesercionCohorteNivelGrafico && tasaDesercionCohorteNivelOrdenado.length > 0 && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaDesercionCohorteNivelOrdenado.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaDesercionCohorteNivelOrdenado} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaDesercionCohorteNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#66bb6a" name=" "
                        {
                          ...(nivelTasaDesercionCohorteGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.nivel === nivelTasaDesercionCohorteGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#66bb6a',
                                '#ff9800',
                                () => abrirModalTasaDesercionCohorteGrafico({ nivel: payload.nivel }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos-tasa-desercion-promedio' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosTasaDesercionPromedio.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#1b5e20'}}>Filtros:</span>
                      {filtrosGraficosTasaDesercionPromedio
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e8f5e9',
                              color: '#1b5e20',
                              border: '1px solid #c8e6c9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosTasaDesercionPromedio.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoTasaDesercionPromedioGraficoSeleccionado(null); setFacultadTasaDesercionPromedioGraficoSeleccionada(null); setProgramaTasaDesercionPromedioGraficoSeleccionado(null); setNivelTasaDesercionPromedioGraficoSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoTasaDesercionPromedioGraficoSeleccionado(null); setFacultadTasaDesercionPromedioGraficoSeleccionada(null); setProgramaTasaDesercionPromedioGraficoSeleccionado(null); setNivelTasaDesercionPromedioGraficoSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#2e7d32', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>

                <h2>{'Tasa de Deserción Promedio Acumulada por Periodo' + `${facultadTasaDesercionPromedioGraficoSeleccionada ? ' - ' + facultadTasaDesercionPromedioGraficoSeleccionada : ''}` + `${programaTasaDesercionPromedioGraficoSeleccionado ? ' - ' + programaTasaDesercionPromedioGraficoSeleccionado : ''}` + `${nivelTasaDesercionPromedioGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionPromedioGraficoSeleccionado : ''}`}</h2>
                {loadingTasaDesercionPromedioPeriodoGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionPromedioPeriodoGrafico && <p style={{color: 'red'}}>{errorTasaDesercionPromedioPeriodoGrafico}</p>}
                {!loadingTasaDesercionPromedioPeriodoGrafico && !errorTasaDesercionPromedioPeriodoGrafico && tasaDesercionPromedioPeriodoGrafico.length > 0 && (
                  <div ref={graficoTasaDesercionPromedioPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaDesercionPromedioPeriodoGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaDesercionPromedioPeriodoGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaDesercionPromedioPeriodoClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#2e7d32" name=" "
                        {
                          ...(periodoTasaDesercionPromedioGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.periodo === periodoTasaDesercionPromedioGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#2e7d32',
                                '#ff9800',
                                () => abrirModalTasaDesercionPromedioGrafico(
                                  { periodo: payload.periodo, facultad: '', programa: '', nivel: '' },
                                  null
                                )
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingTasaDesercionPromedioPeriodoGrafico && !errorTasaDesercionPromedioPeriodoGrafico && tasaDesercionPromedioPeriodoGrafico.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}

                <h2 style={{marginTop: 0}}>
                  {'Tasa de Deserción Promedio Acumulada por Facultad' + `${periodoTasaDesercionPromedioGraficoSeleccionado ? ' - ' + periodoTasaDesercionPromedioGraficoSeleccionado : ''}` + `${programaTasaDesercionPromedioGraficoSeleccionado ? ' - ' + programaTasaDesercionPromedioGraficoSeleccionado : ''}` + `${nivelTasaDesercionPromedioGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionPromedioGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionPromedioFacultadGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionPromedioFacultadGrafico && <p style={{color: 'red'}}>{errorTasaDesercionPromedioFacultadGrafico}</p>}
                {!loadingTasaDesercionPromedioFacultadGrafico && !errorTasaDesercionPromedioFacultadGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaDesercionPromedioFacultadGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaDesercionPromedioFacultadGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaDesercionPromedioFacultadGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaDesercionPromedioFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#388e3c" name=" "
                            {
                              ...(facultadTasaDesercionPromedioGraficoSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadTasaDesercionPromedioGraficoSeleccionada;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#388e3c',
                                    '#ff9800',
                                    () => abrirModalTasaDesercionPromedioGrafico({ facultad: payload.facultad }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Deserción Promedio Acumulada por Programa' + `${periodoTasaDesercionPromedioGraficoSeleccionado ? ' - ' + periodoTasaDesercionPromedioGraficoSeleccionado : ''}` + `${facultadTasaDesercionPromedioGraficoSeleccionada ? ' - ' + facultadTasaDesercionPromedioGraficoSeleccionada : ''}` + `${nivelTasaDesercionPromedioGraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercionPromedioGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionPromedioProgramaGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionPromedioProgramaGrafico && <p style={{color: 'red'}}>{errorTasaDesercionPromedioProgramaGrafico}</p>}
                {!loadingTasaDesercionPromedioProgramaGrafico && !errorTasaDesercionPromedioProgramaGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaDesercionPromedioProgramaGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaDesercionPromedioProgramaGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaDesercionPromedioProgramaGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaDesercionPromedioProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#43a047" name=" "
                            {
                              ...(programaTasaDesercionPromedioGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaTasaDesercionPromedioGraficoSeleccionado;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#43a047',
                                    '#ff9800',
                                    () => abrirModalTasaDesercionPromedioGrafico({ programa: payload.programa }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Deserción Promedio Acumulada por Nivel ' + `${periodoTasaDesercionPromedioGraficoSeleccionado ? ' - ' + periodoTasaDesercionPromedioGraficoSeleccionado : ''}` + `${facultadTasaDesercionPromedioGraficoSeleccionada ? ' - ' + facultadTasaDesercionPromedioGraficoSeleccionada : ''}` + `${programaTasaDesercionPromedioGraficoSeleccionado ? ' - ' + programaTasaDesercionPromedioGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercionPromedioNivelGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercionPromedioNivelGrafico && <p style={{color: 'red'}}>{errorTasaDesercionPromedioNivelGrafico}</p>}
                {!loadingTasaDesercionPromedioNivelGrafico && !errorTasaDesercionPromedioNivelGrafico && tasaDesercionPromedioNivelGrafico.length > 0 && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaDesercionPromedioNivelGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={[...tasaDesercionPromedioNivelGrafico].sort((a, b) => Number(a.nivel) - Number(b.nivel))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaDesercionPromedioNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#66bb6a" name=" "
                        {
                          ...(nivelTasaDesercionPromedioGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.nivel === nivelTasaDesercionPromedioGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#66bb6a',
                                '#ff9800',
                                () => abrirModalTasaDesercionPromedioGrafico({ nivel: payload.nivel }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos-tasa-graduacion' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosTasaGraduacion.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#1b5e20'}}>Filtros:</span>
                      {filtrosGraficosTasaGraduacion
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e8f5e9',
                              color: '#1b5e20',
                              border: '1px solid #c8e6c9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosTasaGraduacion.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoTasaGraduacionGraficoSeleccionado(null); setFacultadTasaGraduacionGraficoSeleccionada(null); setProgramaTasaGraduacionGraficoSeleccionado(null); setNivelTasaGraduacionGraficoSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoTasaGraduacionGraficoSeleccionado(null); setFacultadTasaGraduacionGraficoSeleccionada(null); setProgramaTasaGraduacionGraficoSeleccionado(null); setNivelTasaGraduacionGraficoSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#2e7d32', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>

                <h2>{'Tasa de Graduación Acumulada por Periodo' + `${facultadTasaGraduacionGraficoSeleccionada ? ' - ' + facultadTasaGraduacionGraficoSeleccionada : ''}` + `${programaTasaGraduacionGraficoSeleccionado ? ' - ' + programaTasaGraduacionGraficoSeleccionado : ''}` + `${nivelTasaGraduacionGraficoSeleccionado ? ' - Nivel ' + nivelTasaGraduacionGraficoSeleccionado : ''}`}</h2>
                {loadingTasaGraduacionPeriodoGrafico && <p>Cargando gráfico...</p>}
                {errorTasaGraduacionPeriodoGrafico && <p style={{color: 'red'}}>{errorTasaGraduacionPeriodoGrafico}</p>}
                {!loadingTasaGraduacionPeriodoGrafico && !errorTasaGraduacionPeriodoGrafico && tasaGraduacionPeriodoGrafico.length > 0 && (
                  <div ref={graficoTasaGraduacionPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaGraduacionPeriodoGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaGraduacionPeriodoGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaGraduacionPeriodoClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#2e7d32" name=" "
                        {
                          ...(periodoTasaGraduacionGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.periodo === periodoTasaGraduacionGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#2e7d32',
                                '#ff9800',
                                () => abrirModalTasaGraduacionGrafico(
                                  { periodo: payload.periodo, programa: '', facultad: '', nivel: '' },
                                  null
                                )
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingTasaGraduacionPeriodoGrafico && !errorTasaGraduacionPeriodoGrafico && tasaGraduacionPeriodoGrafico.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}

                <h2 style={{marginTop: 0}}>
                  {'Tasa de Graduación Acumulada por Facultad' + `${periodoTasaGraduacionGraficoSeleccionado ? ' - ' + periodoTasaGraduacionGraficoSeleccionado : ''}` + `${programaTasaGraduacionGraficoSeleccionado ? ' - ' + programaTasaGraduacionGraficoSeleccionado : ''}` + `${nivelTasaGraduacionGraficoSeleccionado ? ' - Nivel ' + nivelTasaGraduacionGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaGraduacionFacultadGrafico && <p>Cargando gráfico...</p>}
                {errorTasaGraduacionFacultadGrafico && <p style={{color: 'red'}}>{errorTasaGraduacionFacultadGrafico}</p>}
                {!loadingTasaGraduacionFacultadGrafico && !errorTasaGraduacionFacultadGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaGraduacionFacultadGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaGraduacionFacultadGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaGraduacionFacultadGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaGraduacionFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#388e3c" name=" "
                            {
                              ...(facultadTasaGraduacionGraficoSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadTasaGraduacionGraficoSeleccionada;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#388e3c',
                                    '#ff9800',
                                    () => abrirModalTasaGraduacionGrafico({ facultad: payload.facultad }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Graduación Acumulada por Programa' + `${periodoTasaGraduacionGraficoSeleccionado ? ' - ' + periodoTasaGraduacionGraficoSeleccionado : ''}` + `${facultadTasaGraduacionGraficoSeleccionada ? ' - ' + facultadTasaGraduacionGraficoSeleccionada : ''}` + `${nivelTasaGraduacionGraficoSeleccionado ? ' - Nivel ' + nivelTasaGraduacionGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaGraduacionProgramaGrafico && <p>Cargando gráfico...</p>}
                {errorTasaGraduacionProgramaGrafico && <p style={{color: 'red'}}>{errorTasaGraduacionProgramaGrafico}</p>}
                {!loadingTasaGraduacionProgramaGrafico && !errorTasaGraduacionProgramaGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaGraduacionProgramaGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaGraduacionProgramaGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaGraduacionProgramaGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaGraduacionProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#43a047" name=" "
                            {
                              ...(programaTasaGraduacionGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaTasaGraduacionGraficoSeleccionado;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#43a047',
                                    '#ff9800',
                                    () => abrirModalTasaGraduacionGrafico({ programa: payload.programa }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Graduación Acumulada por Nivel ' + `${periodoTasaGraduacionGraficoSeleccionado ? ' - ' + periodoTasaGraduacionGraficoSeleccionado : ''}` + `${facultadTasaGraduacionGraficoSeleccionada ? ' - ' + facultadTasaGraduacionGraficoSeleccionada : ''}` + `${programaTasaGraduacionGraficoSeleccionado ? ' - ' + programaTasaGraduacionGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaGraduacionNivelGrafico && <p>Cargando gráfico...</p>}
                {errorTasaGraduacionNivelGrafico && <p style={{color: 'red'}}>{errorTasaGraduacionNivelGrafico}</p>}
                {!loadingTasaGraduacionNivelGrafico && !errorTasaGraduacionNivelGrafico && tasaGraduacionNivelGrafico.length > 0 && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaGraduacionNivelGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={[...tasaGraduacionNivelGrafico].sort((a, b) => Number(a.nivel) - Number(b.nivel))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaGraduacionNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#66bb6a" name=" "
                        {
                          ...(nivelTasaGraduacionGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.nivel === nivelTasaGraduacionGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#66bb6a',
                                '#ff9800',
                                () => abrirModalTasaGraduacionGrafico({ nivel: payload.nivel }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos-tasa-ausencia-intersemestral' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosTasaAusencia.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#1b5e20'}}>Filtros:</span>
                      {filtrosGraficosTasaAusencia
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e8f5e9',
                              color: '#1b5e20',
                              border: '1px solid #c8e6c9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosTasaAusencia.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoTasaAusenciaGraficoSeleccionado(null); setFacultadTasaAusenciaGraficoSeleccionada(null); setProgramaTasaAusenciaGraficoSeleccionado(null); setNivelTasaAusenciaGraficoSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoTasaAusenciaGraficoSeleccionado(null); setFacultadTasaAusenciaGraficoSeleccionada(null); setProgramaTasaAusenciaGraficoSeleccionado(null); setNivelTasaAusenciaGraficoSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#2e7d32', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>

                <h2>{'Tasa de Ausencia Intersemestral por Periodo' + `${facultadTasaAusenciaGraficoSeleccionada ? ' - ' + facultadTasaAusenciaGraficoSeleccionada : ''}` + `${programaTasaAusenciaGraficoSeleccionado ? ' - ' + programaTasaAusenciaGraficoSeleccionado : ''}` + `${nivelTasaAusenciaGraficoSeleccionado ? ' - Nivel ' + nivelTasaAusenciaGraficoSeleccionado : ''}`}</h2>
                {loadingTasaAusenciaPeriodoGrafico && <p>Cargando gráfico...</p>}
                {errorTasaAusenciaPeriodoGrafico && <p style={{color: 'red'}}>{errorTasaAusenciaPeriodoGrafico}</p>}
                {!loadingTasaAusenciaPeriodoGrafico && !errorTasaAusenciaPeriodoGrafico && tasaAusenciaPeriodoGrafico.length > 0 && (
                  <div ref={graficoTasaAusenciaPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaAusenciaPeriodoGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaAusenciaPeriodoGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaAusenciaPeriodoClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#2e7d32" name=" "
                        {
                          ...(periodoTasaAusenciaGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.periodo === periodoTasaAusenciaGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#2e7d32',
                                '#ff9800',
                                () => abrirModalTasaAusenciaGrafico({ periodo: payload.periodo }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingTasaAusenciaPeriodoGrafico && !errorTasaAusenciaPeriodoGrafico && tasaAusenciaPeriodoGrafico.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}

                <h2 style={{marginTop: 0}}>
                  {'Tasa de Ausencia Intersemestral por Facultad' + `${periodoTasaAusenciaGraficoSeleccionado ? ' - ' + periodoTasaAusenciaGraficoSeleccionado : ''}` + `${programaTasaAusenciaGraficoSeleccionado ? ' - ' + programaTasaAusenciaGraficoSeleccionado : ''}` + `${nivelTasaAusenciaGraficoSeleccionado ? ' - Nivel ' + nivelTasaAusenciaGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaAusenciaFacultadGrafico && <p>Cargando gráfico...</p>}
                {errorTasaAusenciaFacultadGrafico && <p style={{color: 'red'}}>{errorTasaAusenciaFacultadGrafico}</p>}
                {!loadingTasaAusenciaFacultadGrafico && !errorTasaAusenciaFacultadGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaAusenciaFacultadGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaAusenciaFacultadGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaAusenciaFacultadGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaAusenciaFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#388e3c" name=" "
                            {
                              ...(facultadTasaAusenciaGraficoSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadTasaAusenciaGraficoSeleccionada;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#388e3c',
                                    '#ff9800',
                                    () => abrirModalTasaAusenciaGrafico({ facultad: payload.facultad }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Ausencia Intersemestral por Programa' + `${periodoTasaAusenciaGraficoSeleccionado ? ' - ' + periodoTasaAusenciaGraficoSeleccionado : ''}` + `${facultadTasaAusenciaGraficoSeleccionada ? ' - ' + facultadTasaAusenciaGraficoSeleccionada : ''}` + `${nivelTasaAusenciaGraficoSeleccionado ? ' - Nivel ' + nivelTasaAusenciaGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaAusenciaProgramaGrafico && <p>Cargando gráfico...</p>}
                {errorTasaAusenciaProgramaGrafico && <p style={{color: 'red'}}>{errorTasaAusenciaProgramaGrafico}</p>}
                {!loadingTasaAusenciaProgramaGrafico && !errorTasaAusenciaProgramaGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaAusenciaProgramaGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaAusenciaProgramaGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaAusenciaProgramaGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaAusenciaProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#43a047" name=" "
                            {
                              ...(programaTasaAusenciaGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.programa === programaTasaAusenciaGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#43a047',
                                '#ff9800',
                                () => abrirModalTasaAusenciaGrafico({ programa: payload.programa }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Ausencia Intersemestral por Nivel ' + `${periodoTasaAusenciaGraficoSeleccionado ? ' - ' + periodoTasaAusenciaGraficoSeleccionado : ''}` + `${facultadTasaAusenciaGraficoSeleccionada ? ' - ' + facultadTasaAusenciaGraficoSeleccionada : ''}` + `${programaTasaAusenciaGraficoSeleccionado ? ' - ' + programaTasaAusenciaGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaAusenciaNivelGrafico && <p>Cargando gráfico...</p>}
                {errorTasaAusenciaNivelGrafico && <p style={{color: 'red'}}>{errorTasaAusenciaNivelGrafico}</p>}
                {!loadingTasaAusenciaNivelGrafico && !errorTasaAusenciaNivelGrafico && tasaAusenciaNivelGrafico.length > 0 && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaAusenciaNivelGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={[...tasaAusenciaNivelGrafico].sort((a, b) => Number(a.nivel) - Number(b.nivel))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaAusenciaNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#66bb6a" name=" "
                        {
                          ...(nivelTasaAusenciaGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.nivel === nivelTasaAusenciaGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#66bb6a',
                                '#ff9800',
                                () => abrirModalTasaAusenciaGrafico({ nivel: payload.nivel }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos-tasa-supervivencia' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosTasaSupervivencia.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#1b5e20'}}>Filtros:</span>
                      {filtrosGraficosTasaSupervivencia
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e8f5e9',
                              color: '#1b5e20',
                              border: '1px solid #c8e6c9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosTasaSupervivencia.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoTasaSupervivenciaGraficoSeleccionado(null); setFacultadTasaSupervivenciaGraficoSeleccionada(null); setProgramaTasaSupervivenciaGraficoSeleccionado(null); setNivelTasaSupervivenciaGraficoSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoTasaSupervivenciaGraficoSeleccionado(null); setFacultadTasaSupervivenciaGraficoSeleccionada(null); setProgramaTasaSupervivenciaGraficoSeleccionado(null); setNivelTasaSupervivenciaGraficoSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#2e7d32', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>

                <h2>{'Tasa de Supervivencia por Periodo' + `${facultadTasaSupervivenciaGraficoSeleccionada ? ' - ' + facultadTasaSupervivenciaGraficoSeleccionada : ''}` + `${programaTasaSupervivenciaGraficoSeleccionado ? ' - ' + programaTasaSupervivenciaGraficoSeleccionado : ''}` + `${nivelTasaSupervivenciaGraficoSeleccionado ? ' - Nivel ' + nivelTasaSupervivenciaGraficoSeleccionado : ''}`}</h2>
                {loadingTasaSupervivenciaPeriodoGrafico && <p>Cargando gráfico...</p>}
                {errorTasaSupervivenciaPeriodoGrafico && <p style={{color: 'red'}}>{errorTasaSupervivenciaPeriodoGrafico}</p>}
                {!loadingTasaSupervivenciaPeriodoGrafico && !errorTasaSupervivenciaPeriodoGrafico && tasaSupervivenciaPeriodoGrafico.length > 0 && (
                  <div ref={graficoTasaSupervivenciaPeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaSupervivenciaPeriodoGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaSupervivenciaPeriodoGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaSupervivenciaPeriodoClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#2e7d32" name=" "
                        {
                          ...(periodoTasaSupervivenciaGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.periodo === periodoTasaSupervivenciaGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#2e7d32',
                                '#ff9800',
                                () => abrirModalTasaSupervivenciaGrafico({ periodo: payload.periodo }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingTasaSupervivenciaPeriodoGrafico && !errorTasaSupervivenciaPeriodoGrafico && tasaSupervivenciaPeriodoGrafico.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}

                <h2 style={{marginTop: 0}}>
                  {'Tasa de Supervivencia por Facultad' + `${periodoTasaSupervivenciaGraficoSeleccionado ? ' - ' + periodoTasaSupervivenciaGraficoSeleccionado : ''}` + `${programaTasaSupervivenciaGraficoSeleccionado ? ' - ' + programaTasaSupervivenciaGraficoSeleccionado : ''}` + `${nivelTasaSupervivenciaGraficoSeleccionado ? ' - Nivel ' + nivelTasaSupervivenciaGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaSupervivenciaFacultadGrafico && <p>Cargando gráfico...</p>}
                {errorTasaSupervivenciaFacultadGrafico && <p style={{color: 'red'}}>{errorTasaSupervivenciaFacultadGrafico}</p>}
                {!loadingTasaSupervivenciaFacultadGrafico && !errorTasaSupervivenciaFacultadGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaSupervivenciaFacultadGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaSupervivenciaFacultadGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaSupervivenciaFacultadGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaSupervivenciaFacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#388e3c" name=" "
                            {
                              ...(facultadTasaSupervivenciaGraficoSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadTasaSupervivenciaGraficoSeleccionada;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#388e3c',
                                    '#ff9800',
                                    () => abrirModalTasaSupervivenciaGrafico({ facultad: payload.facultad }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Supervivencia por Programa' + `${periodoTasaSupervivenciaGraficoSeleccionado ? ' - ' + periodoTasaSupervivenciaGraficoSeleccionado : ''}` + `${facultadTasaSupervivenciaGraficoSeleccionada ? ' - ' + facultadTasaSupervivenciaGraficoSeleccionada : ''}` + `${nivelTasaSupervivenciaGraficoSeleccionado ? ' - Nivel ' + nivelTasaSupervivenciaGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaSupervivenciaProgramaGrafico && <p>Cargando gráfico...</p>}
                {errorTasaSupervivenciaProgramaGrafico && <p style={{color: 'red'}}>{errorTasaSupervivenciaProgramaGrafico}</p>}
                {!loadingTasaSupervivenciaProgramaGrafico && !errorTasaSupervivenciaProgramaGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaSupervivenciaProgramaGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaSupervivenciaProgramaGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaSupervivenciaProgramaGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaSupervivenciaProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#43a047" name=" "
                            {
                              ...(programaTasaSupervivenciaGraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaTasaSupervivenciaGraficoSeleccionado;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#43a047',
                                    '#ff9800',
                                    () => abrirModalTasaSupervivenciaGrafico({ programa: payload.programa }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Supervivencia por Nivel ' + `${periodoTasaSupervivenciaGraficoSeleccionado ? ' - ' + periodoTasaSupervivenciaGraficoSeleccionado : ''}` + `${facultadTasaSupervivenciaGraficoSeleccionada ? ' - ' + facultadTasaSupervivenciaGraficoSeleccionada : ''}` + `${programaTasaSupervivenciaGraficoSeleccionado ? ' - ' + programaTasaSupervivenciaGraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaSupervivenciaNivelGrafico && <p>Cargando gráfico...</p>}
                {errorTasaSupervivenciaNivelGrafico && <p style={{color: 'red'}}>{errorTasaSupervivenciaNivelGrafico}</p>}
                {!loadingTasaSupervivenciaNivelGrafico && !errorTasaSupervivenciaNivelGrafico && tasaSupervivenciaNivelGrafico.length > 0 && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaSupervivenciaNivelGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={[...tasaSupervivenciaNivelGrafico].sort((a, b) => Number(a.nivel) - Number(b.nivel))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaSupervivenciaNivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#66bb6a" name=" "
                        {
                          ...(nivelTasaSupervivenciaGraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.nivel === nivelTasaSupervivenciaGraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#66bb6a',
                                '#ff9800',
                                () => abrirModalTasaSupervivenciaGrafico({ nivel: payload.nivel }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista === 'graficos-tasa-desercion-periodo-2-8' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  {filtrosGraficosTasaDesercion28.some((filtro) => filtro.value) ? (
                    <>
                      <span style={{fontSize: 14, fontWeight: 500, color: '#1b5e20'}}>Filtros:</span>
                      {filtrosGraficosTasaDesercion28
                        .filter((filtro) => filtro.value)
                        .map((filtro) => (
                          <span
                            key={filtro.label}
                            role="button"
                            tabIndex={0}
                            onClick={filtro.onRemove}
                            onKeyDown={(e) => e.key === 'Enter' && filtro.onRemove()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#e8f5e9',
                              color: '#1b5e20',
                              border: '1px solid #c8e6c9',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Clic para quitar filtro"
                          >
                            {filtro.label}: {filtro.value}
                            <span style={{fontWeight: 'bold', marginLeft: 2}}>×</span>
                          </span>
                        ))}
                      {filtrosGraficosTasaDesercion28.filter((f) => f.value).length >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => { setPeriodoTasaDesercion28GraficoSeleccionado(null); setFacultadTasaDesercion28GraficoSeleccionada(null); setProgramaTasaDesercion28GraficoSeleccionado(null); setNivelTasaDesercion28GraficoSeleccionado(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setPeriodoTasaDesercion28GraficoSeleccionado(null); setFacultadTasaDesercion28GraficoSeleccionada(null); setProgramaTasaDesercion28GraficoSeleccionado(null); setNivelTasaDesercion28GraficoSeleccionado(null); } }}
                          style={{ fontSize: 12, color: '#2e7d32', textDecoration: 'underline', cursor: 'pointer' }}
                          title="Quitar todos los filtros"
                        >
                          Quitar todos
                        </span>
                      )}
                    </>
                  ) : null}
                </div>

                <h2>{'Tasa de Deserción Periodo 2.8 por Periodo' + `${facultadTasaDesercion28GraficoSeleccionada ? ' - ' + facultadTasaDesercion28GraficoSeleccionada : ''}` + `${programaTasaDesercion28GraficoSeleccionado ? ' - ' + programaTasaDesercion28GraficoSeleccionado : ''}` + `${nivelTasaDesercion28GraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercion28GraficoSeleccionado : ''}`}</h2>
                {loadingTasaDesercion28PeriodoGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercion28PeriodoGrafico && <p style={{color: 'red'}}>{errorTasaDesercion28PeriodoGrafico}</p>}
                {!loadingTasaDesercion28PeriodoGrafico && !errorTasaDesercion28PeriodoGrafico && tasaDesercion28PeriodoGrafico.length > 0 && (
                  <div ref={graficoTasaDesercion28PeriodoScrollRef} style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaDesercion28PeriodoGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={tasaDesercion28PeriodoGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaDesercion28PeriodoClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#2e7d32" name=" "
                        {
                          ...(periodoTasaDesercion28GraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.periodo === periodoTasaDesercion28GraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#2e7d32',
                                '#ff9800',
                                () => abrirModalTasaDesercion28Grafico({ periodo: payload.periodo }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!loadingTasaDesercion28PeriodoGrafico && !errorTasaDesercion28PeriodoGrafico && tasaDesercion28PeriodoGrafico.length === 0 && (
                  <p>No hay datos para mostrar.</p>
                )}

                <h2 style={{marginTop: 0}}>
                  {'Tasa de Deserción Periodo 2.8 por Facultad' + `${periodoTasaDesercion28GraficoSeleccionado ? ' - ' + periodoTasaDesercion28GraficoSeleccionado : ''}` + `${programaTasaDesercion28GraficoSeleccionado ? ' - ' + programaTasaDesercion28GraficoSeleccionado : ''}` + `${nivelTasaDesercion28GraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercion28GraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercion28FacultadGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercion28FacultadGrafico && <p style={{color: 'red'}}>{errorTasaDesercion28FacultadGrafico}</p>}
                {!loadingTasaDesercion28FacultadGrafico && !errorTasaDesercion28FacultadGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaDesercion28FacultadGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaDesercion28FacultadGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaDesercion28FacultadGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaDesercion28FacultadClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="facultad" width={220} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#388e3c" name=" "
                            {
                              ...(facultadTasaDesercion28GraficoSeleccionada && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.facultad === facultadTasaDesercion28GraficoSeleccionada;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#388e3c',
                                    '#ff9800',
                                    () => abrirModalTasaDesercion28Grafico({ facultad: payload.facultad }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Deserción Periodo 2.8 por Programa' + `${periodoTasaDesercion28GraficoSeleccionado ? ' - ' + periodoTasaDesercion28GraficoSeleccionado : ''}` + `${facultadTasaDesercion28GraficoSeleccionada ? ' - ' + facultadTasaDesercion28GraficoSeleccionada : ''}` + `${nivelTasaDesercion28GraficoSeleccionado ? ' - Nivel ' + nivelTasaDesercion28GraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercion28ProgramaGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercion28ProgramaGrafico && <p style={{color: 'red'}}>{errorTasaDesercion28ProgramaGrafico}</p>}
                {!loadingTasaDesercion28ProgramaGrafico && !errorTasaDesercion28ProgramaGrafico && (
                  <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', marginBottom: 10, maxHeight: 500}}>
                    <div style={{minWidth: 850, minHeight: Math.max(250, tasaDesercion28ProgramaGrafico.length * 36)}}>
                      <ResponsiveContainer width="100%" height={Math.max(250, tasaDesercion28ProgramaGrafico.length * 36)}>
                        <BarChart layout="vertical" data={tasaDesercion28ProgramaGrafico} margin={{ top: 20, right: 80, left: 8, bottom: 5 }}
                          onClick={handleBarTasaDesercion28ProgramaClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals />
                          <YAxis type="category" dataKey="programa" width={380} tick={{ fontSize: 12 }} interval={0} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="tasa" label={{ position: 'right' }} fill="#43a047" name=" "
                            {
                              ...(programaTasaDesercion28GraficoSeleccionado && {
                                shape: (props) => {
                                  const { payload } = props;
                                  const isSelected = payload.programa === programaTasaDesercion28GraficoSeleccionado;
                                  return renderBarConVerDatos(
                                    props,
                                    isSelected,
                                    '#43a047',
                                    '#ff9800',
                                    () => abrirModalTasaDesercion28Grafico({ programa: payload.programa }, payload)
                                  );
                                }
                              })
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h2 style={{marginTop: 40}}>
                  {'Tasa de Deserción Periodo 2.8 por Nivel ' + `${periodoTasaDesercion28GraficoSeleccionado ? ' - ' + periodoTasaDesercion28GraficoSeleccionado : ''}` + `${facultadTasaDesercion28GraficoSeleccionada ? ' - ' + facultadTasaDesercion28GraficoSeleccionada : ''}` + `${programaTasaDesercion28GraficoSeleccionado ? ' - ' + programaTasaDesercion28GraficoSeleccionado : ''}`}
                </h2>
                {loadingTasaDesercion28NivelGrafico && <p>Cargando gráfico...</p>}
                {errorTasaDesercion28NivelGrafico && <p style={{color: 'red'}}>{errorTasaDesercion28NivelGrafico}</p>}
                {!loadingTasaDesercion28NivelGrafico && !errorTasaDesercion28NivelGrafico && tasaDesercion28NivelGrafico.length > 0 && (
                  <div style={{overflowX: 'auto', overflowY: 'hidden', width: '100%', marginBottom: 10}}>
                    <div style={{minWidth: Math.max(800, tasaDesercion28NivelGrafico.length * 48), height: 400}}>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={[...tasaDesercion28NivelGrafico].sort((a, b) => Number(a.nivel) - Number(b.nivel))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          onClick={handleBarTasaDesercion28NivelClick}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" angle={-45} textAnchor="end" height={70} interval={0} />
                      <YAxis allowDecimals />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="tasa" label={{ position: 'top' }} fill="#66bb6a" name=" "
                        {
                          ...(nivelTasaDesercion28GraficoSeleccionado && {
                            shape: (props) => {
                              const { payload } = props;
                              const isSelected = payload.nivel === nivelTasaDesercion28GraficoSeleccionado;
                              return renderBarConVerDatos(
                                props,
                                isSelected,
                                '#66bb6a',
                                '#ff9800',
                                () => abrirModalTasaDesercion28Grafico({ nivel: payload.nivel }, payload)
                              );
                            }
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            {vista.startsWith('graficos-tasa-') &&
              vista !== 'graficos-tasa-desercion' &&
              vista !== 'graficos-tasa-desercion-cohorte' &&
              vista !== 'graficos-tasa-desercion-promedio' &&
              vista !== 'graficos-tasa-graduacion' &&
              vista !== 'graficos-tasa-ausencia-intersemestral' &&
              vista !== 'graficos-tasa-supervivencia' &&
              vista !== 'graficos-tasa-desercion-periodo-2-8' && (
              <div style={{padding: 20}}>
                <p style={{color: '#6c757d'}}>Estos gráficos estarán disponibles próximamente.</p>
              </div>
            )}
            {vista === 'tasa-desercion' && (
              <div style={{padding: 20}}>
                {loadingTasaDesercion && <p>Cargando períodos...</p>}
                {errorTasaDesercion && <p style={{color: 'red'}}>{errorTasaDesercion}</p>}
                {!loadingTasaDesercion && !errorTasaDesercion && periodosTasaDesercion.length > 0 && (
                  <div style={{marginTop: 20}}>
                    <div style={{display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="periodoTasaDesercion" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Período:
                        </label>
                        <select 
                          id="periodoTasaDesercion" 
                          value={periodoSeleccionadoTasa} 
                          onChange={handlePeriodoTasaChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #1976d2',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '200px'
                          }}
                        >
                          <option value="">-- Seleccionar período --</option>
                          {periodosTasaDesercion.map((periodo) => (
                            <option key={periodo} value={periodo}>{periodo}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="programaTasaDesercion" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Programa:
                        </label>
                        <select 
                          id="programaTasaDesercion" 
                          value={programaSeleccionadoTasa} 
                          onChange={handleProgramaTasaChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #43a047',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '250px'
                          }}
                        >
                          <option value="">-- Todos --</option>
                          {programasTasaDesercion.map((programa) => (
                            <option key={programa} value={programa}>{programa}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Sección de cálculo de tasa de deserción */}
                    {periodosTasaDesercion.length > 0 && (
                      renderTasaDesercionCalculo({
                        periodoActual: periodoSeleccionadoTasa || (periodosTasaDesercion.length > 0 ? periodosTasaDesercion[0] : ''),
                        programaActual: programaSeleccionadoTasa || '',
                        onActualizar: () => {
                          const periodoActual = periodoSeleccionadoTasa || (periodosTasaDesercion.length > 0 ? periodosTasaDesercion[0] : '');
                          const programaActual = programaSeleccionadoTasa || '';
                          calcularTasaDesercion(token, periodoActual, programaActual);
                        }
                      })
                    )}
                  </div>
                )}
                {!loadingTasaDesercion && !errorTasaDesercion && periodosTasaDesercion.length === 0 && (
                  <p>No se encontraron períodos disponibles.</p>
                )}
              </div>
            )}
            {vista === 'tasa-desercion-periodo-2-8' && (
              <div style={{padding: 20}}>
                {loadingTasaDesercion28 && <p>Cargando períodos...</p>}
                {errorTasaDesercion28 && <p style={{color: 'red'}}>{errorTasaDesercion28}</p>}
                {!loadingTasaDesercion28 && !errorTasaDesercion28 && periodosTasaDesercion28.length > 0 && (
                  <div style={{marginTop: 20}}>
                    <div style={{display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="periodoTasaDesercion28" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Período:
                        </label>
                        <select 
                          id="periodoTasaDesercion28" 
                          value={periodoSeleccionadoTasa28} 
                          onChange={handlePeriodoTasa28Change}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #1976d2',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '200px'
                          }}
                        >
                          <option value="">-- Seleccionar período --</option>
                          {periodosTasaDesercion28.map((periodo) => (
                            <option key={periodo} value={periodo}>{periodo}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="programaTasaDesercion28" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Programa:
                        </label>
                        <select 
                          id="programaTasaDesercion28" 
                          value={programaSeleccionadoTasa28} 
                          onChange={handleProgramaTasa28Change}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #43a047',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '250px'
                          }}
                        >
                          <option value="">-- Todos --</option>
                          {programasTasaDesercion28.map((programa) => (
                            <option key={programa} value={programa}>{programa}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Sección de cálculo de tasa de deserción periodo 2.8 */}
                    {periodosTasaDesercion28.length > 0 && (
                      <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        border: '2px solid #6c757d',
                        borderRadius: '10px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: '0', color: '#495057'}}>
                            Cálculo de Tasa de Deserción Periodo 2.8 (TDP)
                          </h3>
                          <button
                            onClick={() => {
                              const periodoActual = periodoSeleccionadoTasa28 || (periodosTasaDesercion28.length > 0 ? periodosTasaDesercion28[0] : '');
                              const programaActual = programaSeleccionadoTasa28 || '';
                              calcularTasaDesercion28(token, periodoActual, programaActual);
                            }}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Actualizar
                          </button>
                        </div>
                        
                        {/* Fórmula visual */}
                        <div style={{
                          textAlign: 'center',
                          marginBottom: '30px',
                          padding: '20px',
                          backgroundColor: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px'
                        }}>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            gap: '5px'
                          }}>
                            <span>TDP<sub>t</sub> = (</span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '20px'
                            }}>
                              <span>Desertores identificados en t / Matriculados no graduados de t-2</span>
                            </div>
                            <span>) * 100</span>
                          </div>
                          <div style={{fontSize: '14px', color: '#6c757d', marginTop: '10px'}}>
                            Donde t es el periodo.
                          </div>
                        </div>

                        {/* Datos del cálculo */}
                        {loadingCalculoTasa28 ? (
                          <div style={{textAlign: 'center', padding: '20px'}}>
                            <p>Cargando datos para el cálculo...</p>
                          </div>
                        ) : errorCalculoTasa28 ? (
                          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}>
                            <p>Error al calcular la tasa de deserción periodo 2.8: {errorCalculoTasa28}</p>
                          </div>
                        ) : datosTasaDesercion28 ? (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            marginTop: '20px'
                          }}>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Desertores</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#dc3545',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickDesertores28}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#f8d7da';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de desertores"
                              >
                                {datosTasaDesercion28.desertores}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                Período {datosTasaDesercion28.periodo}
                              </div>
                              <div style={{fontSize: '12px', color: '#dc3545', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Matriculados</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#007bff',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickMatriculados28}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#e3f2fd';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de matriculados no graduados"
                              >
                                {datosTasaDesercion28.matriculados}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                Período {datosTasaDesercion28.periodoConsulta}
                              </div>
                              <div style={{fontSize: '12px', color: '#007bff', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>TDP</h4>
                              <div style={{
                                fontSize: '32px', 
                                fontWeight: 'bold', 
                                color: '#28a745'
                              }}>
                                {datosTasaDesercion28.tasa}%
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                {datosTasaDesercion28.programa}
                              </div>
                            </div>
                          </div>
                        ) : !programaSeleccionadoTasa28 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            backgroundColor: '#d1ecf1',
                            border: '1px solid #bee5eb',
                            borderRadius: '8px',
                            color: '#0c5460'
                          }}>
                            <p style={{margin: '0', fontSize: '16px', fontWeight: 'bold'}}>
                              Calculando para TODOS los programas
                            </p>
                            <p style={{margin: '5px 0 0 0', fontSize: '14px'}}>
                              Selecciona un programa específico para ver el cálculo individual
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
                {!loadingTasaDesercion28 && !errorTasaDesercion28 && periodosTasaDesercion28.length === 0 && (
                  <p>No se encontraron períodos disponibles.</p>
                )}
              </div>
            )}
            {vista === 'riesgo-desercion' && (
              <div style={{padding: 20}}>
                <div style={{display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                  <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                    <label htmlFor="facultadRiesgo" style={{fontWeight: 'bold', fontSize: '16px'}}>
                      Facultad:
                    </label>
                    <select
                      id="facultadRiesgo"
                      value={riesgoFacultad}
                      onChange={(e) => {
                        setRiesgoFacultad(e.target.value);
                        setRiesgoPrograma('');
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '16px',
                        border: '2px solid #6c757d',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        minWidth: '220px'
                      }}
                    >
                      <option value="">-- Todas --</option>
                      {facultades.map((fac) => (
                        <option key={fac} value={fac}>{fac}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                    <label htmlFor="programaRiesgo" style={{fontWeight: 'bold', fontSize: '16px'}}>
                      Programa:
                    </label>
                    <select
                      id="programaRiesgo"
                      value={riesgoPrograma}
                      onChange={(e) => setRiesgoPrograma(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '16px',
                        border: '2px solid #6c757d',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        minWidth: '240px'
                      }}
                    >
                      <option value="">-- Todos --</option>
                      {programasRiesgo.map((prog) => (
                        <option key={prog} value={prog}>{prog}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                    <label htmlFor="umbralRiesgo" style={{fontWeight: 'bold', fontSize: '16px'}}>
                      Umbral:
                    </label>
                    <input
                      id="umbralRiesgo"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={riesgoUmbral}
                      onChange={(e) => setRiesgoUmbral(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '16px',
                        border: '2px solid #43a047',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        width: '120px'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => fetchRiesgoDesercion(token, 'actual', riesgoUmbral, riesgoFacultad, riesgoPrograma)}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Actualizar
                  </button>
                </div>

                {loadingRiesgo && <p>Cargando estudiantes con alto riesgo...</p>}
                {errorRiesgo && <p style={{color: 'red'}}>{errorRiesgo}</p>}

                {!loadingRiesgo && !errorRiesgo && (
                  <div>
                    {riesgoOrdenado.length > 0 && (
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <p style={{fontWeight: 'bold', margin: 0, color: '#555'}}>Resultados: {riesgoOrdenado.length}</p>
                        <button
                          onClick={() => exportarCSV(riesgoOrdenado, 'riesgo-desercion')}
                          style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title="Exportar datos a CSV"
                        >
                          📊 Exportar CSV
                        </button>
                      </div>
                    )}
                    {riesgoOrdenado.length === 0 && (
                      <div style={{marginBottom: 10, color: '#555'}}>Resultados: 0</div>
                    )}
                    <table border="1" style={{margin: '0 auto'}}>
                        <thead>
                          <tr style={{backgroundColor: '#f8f9fa'}}>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Prob. deserción</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                            <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riesgoOrdenado.map((item, index) => (
                            <tr key={`${item.documento || item.codigo || index}`} style={{backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'}}>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{index + 1}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>
                                {typeof item.prob_deserto === 'number' ? item.prob_deserto.toFixed(3) : '-'}
                              </td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.NombrePeriodo || item.periodo)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.programa)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.facultad)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.estudiante)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.codigo)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.EstadoMatricula)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.nivel)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.PERINGRESO)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.EstadoEstudiante)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.tipodocumento)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.documento)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.telefonoppal)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.celular)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.correounac)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.correootro)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.muniprocedencia)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.dptoprocedencia)}</td>
                              <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{celdaTexto(item.paisprocedencia)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </div>
                )}
              </div>
            )}
            {vista === 'manual-usuario' && (
              <div style={{padding: 20, maxWidth: 900, lineHeight: 1.6}}>
                <p style={{color: '#555', marginBottom: 24}}>Sistema de gestión de deserción estudiantil - Corporación Universitaria Adventista - UNAC</p>
                <p style={{fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: 24}}>Este sistema se fundamenta en la metodología SPADIES 3.0 del Ministerio de Educación Nacional de Colombia.</p>

                <h3 style={{color: '#1976d2', marginTop: 28}}>1. Introducción</h3>
                <p>Este sistema permite consultar y analizar información sobre matrículas, deserción estudiantil, tasas de deserción, graduación y riesgo de deserción. Utilice el menú lateral para navegar entre las diferentes secciones.</p>

                <h3 style={{color: '#1976d2', marginTop: 28}}>2. Definiciones fundamentales (metodología SPADIES 3.0)</h3>
                <p>Para una correcta interpretación de los datos, es importante conocer las definiciones adoptadas por el Ministerio de Educación en el SPADIES (Sistema para la Prevención y Análisis de la Deserción en la Educación Superior):</p>

                <h4 style={{color: '#555', marginTop: 20}}>2.1 Deserción</h4>
                <p>Un estudiante se clasifica como <strong>desertor</strong> cuando <strong>no se ha matriculado por dos o más períodos consecutivos</strong> en algún programa académico y no se encuentra como graduado ni retirado por motivos disciplinarios. La metodología diferencia:</p>
                <ul style={{marginLeft: 20}}>
                  <li><strong>Desertor de Programa:</strong> no se matricula en el mismo programa durante dos o más períodos consecutivos.</li>
                  <li><strong>Desertor de Institución:</strong> no se matricula en la institución durante dos o más períodos consecutivos.</li>
                  <li><strong>Desertor del Sistema:</strong> no se matricula en ningún programa de ninguna IES durante dos o más períodos consecutivos.</li>
                </ul>

                <h4 style={{color: '#555', marginTop: 20}}>2.2 Ausencia intersemestral</h4>
                <p>Es la condición de estudiantes que <strong>estando matriculados en un período</strong> no se matriculan en el período siguiente, pero aún no cumplen el criterio de dos períodos consecutivos sin matrícula para ser clasificados como desertores. La <strong>Tasa de Ausencia Intersemestral (TAI)</strong> mide la proporción de estudiantes en riesgo de desertar al no matricularse durante un semestre; es un indicador de alerta temprana.</p>

                <h4 style={{color: '#555', marginTop: 20}}>2.3 Cohorte</h4>
                <p>Semestre en el cual el estudiante fue registrado como <strong>primíparo</strong> (estudiante que ingresa por primera vez a un programa académico). El análisis por cohorte permite hacer seguimiento a trayectorias estudiantiles a lo largo del tiempo.</p>

                <h4 style={{color: '#555', marginTop: 20}}>2.4 Primíparo</h4>
                <p>Estudiante que ingresa por primera vez a un programa académico en la institución.</p>

                <h4 style={{color: '#555', marginTop: 20}}>2.5 Graduado</h4>
                <p>Estudiante que ha completado exitosamente todos los requisitos académicos del programa.</p>

                <h3 style={{color: '#1976d2', marginTop: 28}}>3. Tasas e indicadores</h3>
                <p>El SPADIES 3.0 permite el cálculo de 7 indicadores sobre deserción y permanencia: <strong>deserción por cohorte</strong>, <strong>deserción promedio acumulada</strong>, <strong>deserción anual</strong>, <strong>tasa de graduación acumulada</strong>, <strong>análisis de supervivencia</strong>, <strong>ausencia intersemestral</strong> y la <strong>tasa de deserción periodo 2.8</strong>. A continuación se presenta la utilidad de cada uno de estos indicadores y su fórmula de cálculo, conforme al documento del Ministerio de Educación Nacional (SPADIES 3.0):</p>

                <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 14}}>
                  <thead>
                    <tr style={{backgroundColor: '#1976d2', color: 'white'}}>
                      <th style={{padding: '10px 12px', textAlign: 'left', border: '1px solid #ddd'}}>Indicador</th>
                      <th style={{padding: '10px 12px', textAlign: 'left', border: '1px solid #ddd'}}>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top', fontWeight: 'bold', width: '22%'}}>Tasa de deserción anual</td>
                      <td style={{padding: '12px', border: '1px solid #dee2e6'}}>
                        <ul style={{margin: '0 0 8px 20px', padding: 0}}>
                          <li>Mide el comportamiento de la deserción en el corto plazo y permite evidenciar los esfuerzos de las IES y de la política pública.</li>
                          <li>Porcentaje de estudiantes que son identificados como desertores en <em>t</em> y que estuvieron matriculados en el periodo <em>t</em>−2.</li>
                        </ul>
                        <div style={{backgroundColor: modoOscuro ? '#2d2d2d' : '#f5f5f5', color: modoOscuro ? '#e5e5e5' : '#222', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap'}}>TDA_t = (Desertores de t / Matriculados en t−2) × 100</div>
                        <p style={{fontSize: 12, color: manualDondeColor, margin: '6px 0 0 0'}}><strong>Donde:</strong> <em>t</em> es el periodo.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top', fontWeight: 'bold'}}>Tasa de deserción por cohorte</td>
                      <td style={{padding: '12px', border: '1px solid #dee2e6'}}>
                        <ul style={{margin: '0 0 8px 20px', padding: 0}}>
                          <li>Permite observar el fenómeno de la deserción en estudiantes que ingresaron en el mismo periodo de tiempo.</li>
                          <li>Número acumulado de desertores de una cohorte hasta un semestre determinado, sobre los primíparos de esa cohorte.</li>
                        </ul>
                        <div style={{backgroundColor: modoOscuro ? '#2d2d2d' : '#f5f5f5', color: modoOscuro ? '#e5e5e5' : '#222', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap'}}>TDC_c,s = (Σ Desertores_c,s de s=1 a S) / Primíparos_c × 100</div>
                        <p style={{fontSize: 12, color: manualDondeColor, margin: '6px 0 0 0'}}><strong>Donde:</strong> <em>c</em> es la cohorte y <em>s</em> el semestre.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top', fontWeight: 'bold'}}>Tasa de deserción promedio acumulada</td>
                      <td style={{padding: '12px', border: '1px solid #dee2e6'}}>
                        <ul style={{margin: '0 0 8px 20px', padding: 0}}>
                          <li>Evidencia la tendencia estructural del sistema educativo, reflejando en el largo plazo la deserción de los estudiantes según el semestre en que abandonaron sus estudios.</li>
                          <li>Conteo acumulado de desertores hasta un semestre determinado de todas las cohortes que tienen hasta ese semestre, sobre la totalidad de primíparos de dichas cohortes.</li>
                        </ul>
                        <div style={{backgroundColor: modoOscuro ? '#2d2d2d' : '#f5f5f5', color: modoOscuro ? '#e5e5e5' : '#222', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap'}}>TDPA_s = (Σ Σ Desertores_c,s) / (Σ Primíparos_c) × 100</div>
                        <p style={{fontSize: 12, color: manualDondeColor, margin: '6px 0 0 0'}}><strong>Donde:</strong> <em>c</em> es la cohorte y <em>s</em> el semestre.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top', fontWeight: 'bold'}}>Tasa de graduación acumulada</td>
                      <td style={{padding: '12px', border: '1px solid #dee2e6'}}>
                        <ul style={{margin: '0 0 8px 20px', padding: 0}}>
                          <li>Contabiliza el porcentaje acumulado de estudiantes que se gradúan semestre a semestre.</li>
                          <li>Número de graduados hasta un semestre determinado, sobre el total de primíparos de todas las cohortes.</li>
                        </ul>
                        <div style={{backgroundColor: modoOscuro ? '#2d2d2d' : '#f5f5f5', color: modoOscuro ? '#e5e5e5' : '#222', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap'}}>TGA_s = (Σ Σ Graduados_c,s) / (Σ Primíparos_c) × 100</div>
                        <p style={{fontSize: 12, color: manualDondeColor, margin: '6px 0 0 0'}}><strong>Donde:</strong> <em>c</em> es la cohorte y <em>s</em> el semestre.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top', fontWeight: 'bold'}}>Tasa de ausencia intersemestral</td>
                      <td style={{padding: '12px', border: '1px solid #dee2e6'}}>
                        <ul style={{margin: '0 0 8px 20px', padding: 0}}>
                          <li>Proporción de estudiantes que estando matriculados un semestre atrás son clasificados como ausentes un periodo después.</li>
                        </ul>
                        <div style={{backgroundColor: modoOscuro ? '#2d2d2d' : '#f5f5f5', color: modoOscuro ? '#e5e5e5' : '#222', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap'}}>TAI_t = (Ausentes_t / Matriculados_t−1) × 100</div>
                        <p style={{fontSize: 12, color: manualDondeColor, margin: '6px 0 0 0'}}><strong>Donde:</strong> <em>t</em> es el periodo.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top', fontWeight: 'bold'}}>Tasa de supervivencia</td>
                      <td style={{padding: '12px', border: '1px solid #dee2e6'}}>
                        <ul style={{margin: '0 0 8px 20px', padding: 0}}>
                          <li>Proporción de estudiantes en cada semestre que permanecen matriculados luego de haber sido primíparos de un programa académico de una IES.</li>
                        </ul>
                        <div style={{backgroundColor: modoOscuro ? '#2d2d2d' : '#f5f5f5', color: modoOscuro ? '#e5e5e5' : '#222', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap'}}>TS_s = (Matriculados_s / Primíparos de todas las cohortes que tienen hasta el semestre S) × 100</div>
                        <p style={{fontSize: 12, color: manualDondeColor, margin: '6px 0 0 0'}}><strong>Donde:</strong> <em>s</em> es el semestre.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top', fontWeight: 'bold'}}>Tasa deserción periodo 2.8</td>
                      <td style={{padding: '12px', border: '1px solid #dee2e6'}}>
                        <ul style={{margin: '0 0 8px 20px', padding: 0}}>
                          <li>Proporción de estudiantes que estando matriculados dos semestres atrás son clasificados como desertores un año después.</li>
                          <li>Número de desertores en el periodo sobre los matriculados en dos periodos atrás que no se graduaron en <em>t</em>−2, <em>t</em>−1 y <em>t</em>.</li>
                        </ul>
                        <div style={{backgroundColor: modoOscuro ? '#2d2d2d' : '#f5f5f5', color: modoOscuro ? '#e5e5e5' : '#222', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap'}}>TDP_t = (Desertores identificados en t / Matriculados no graduados de t−2) × 100</div>
                        <p style={{fontSize: 12, color: manualDondeColor, margin: '6px 0 0 0'}}><strong>Donde:</strong> <em>t</em> es el periodo.</p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <h3 style={{color: '#1976d2', marginTop: 28}}>4. Tablas</h3>
                <p>En la sección <strong>Tablas</strong> puede consultar datos detallados:</p>
                <ul style={{marginLeft: 20}}>
                  <li><strong>Matrículas:</strong> Lista de estudiantes matriculados. Filtre por período, facultad y programa. Exporte a CSV.</li>
                  <li><strong>Deserción:</strong> Registros de estudiantes clasificados como desertores (dos o más períodos consecutivos sin matrícula). Mismos filtros disponibles.</li>
                  <li><strong>Primíparos:</strong> Estudiantes en su primer período académico en el programa.</li>
                  <li><strong>Graduados:</strong> Estudiantes que han completado sus estudios.</li>
                  <li><strong>Ausencia intersemestral:</strong> Estudiantes que no se matricularon en el período actual pero sí en el anterior; en riesgo potencial de deserción.</li>
                </ul>
                <p>Todas las tablas permiten <strong>exportar a CSV</strong> haciendo clic en el botón "📊 Exportar CSV". Los encabezados permanecen visibles al hacer scroll vertical.</p>

                <h3 style={{color: '#1976d2', marginTop: 28}}>5. Gráficos</h3>
                <p>Visualice estadísticas por Matrículas, Deserción, Primíparos, Graduados o Ausencia intersemestral. Seleccione período, facultad, programa y nivel para filtrar. Haga clic en las barras o elementos del gráfico para ver detalles en modal.</p>

                <h3 style={{color: '#1976d2', marginTop: 28}}>6. Tasas (consulta)</h3>
                <p>En esta sección puede consultar cada una de las tasas definidas anteriormente. Use los filtros de período, programa y facultad según corresponda. Los botones "Ver datos" abren modales con la lista detallada de estudiantes relacionados a cada indicador.</p>

                <h3 style={{color: '#1976d2', marginTop: 28}}>7. Gráficos Tasas</h3>
                <p>Representaciones gráficas de las tasas. Permite comparar visualmente períodos y programas para el análisis de tendencias.</p>

                <h3 style={{color: '#1976d2', marginTop: 28}}>8. Riesgo de deserción (ML)</h3>
                <p>Predicción de riesgo de deserción mediante aprendizaje automático (ML):</p>
                <ul style={{marginLeft: 20}}>
                  <li>Filtre por <strong>Facultad</strong> y <strong>Programa</strong>.</li>
                  <li>Ajuste el <strong>Umbral</strong> (0–1) para definir qué probabilidad se considera alto riesgo.</li>
                  <li>Haga clic en <strong>Actualizar</strong> para cargar los resultados.</li>
                  <li>Exporte a CSV con el botón correspondiente.</li>
                </ul>
                <p>La tabla muestra la probabilidad de deserción ordenada de mayor a menor, junto con los datos del estudiante.</p>

                <h3 style={{color: '#1976d2', marginTop: 28}}>9. Opciones generales</h3>
                <ul style={{marginLeft: 20}}>
                  <li><strong>Configuración:</strong> Haga clic en el icono ⚙️ junto a su usuario en el menú lateral para abrir la página de configuración. Allí puede <strong>cambiar su contraseña</strong>. Si tiene rol de administrador, podrá crear, editar y eliminar usuarios del sistema.</li>
                  <li><strong>Modo oscuro:</strong> Active o desactive el interruptor en el menú lateral para alternar entre tema claro y oscuro. La preferencia se guarda automáticamente.</li>
                  <li><strong>Con Cancelados:</strong> Active o desactive en la parte inferior del menú para incluir o excluir estudiantes con matrícula cancelada en los cálculos.</li>
                  <li><strong>Cerrar sesión:</strong> Use el botón al final del menú lateral para salir del sistema.</li>
                </ul>
              </div>
            )}
            {vista === 'configuracion' && (
              <div style={{padding: 20, maxWidth: 700}}>
                <h3 style={{color: '#1976d2', marginTop: 0}}>Cambiar contraseña</h3>
                <form onSubmit={handleConfigCambiarPassword} style={{marginBottom: 30}}>
                  <div style={{marginBottom: 10}}>
                    <label style={{display: 'block', marginBottom: 4}}>Contraseña actual</label>
                    <input type="password" value={configPasswordActual} onChange={e => setConfigPasswordActual(e.target.value)} required style={{width: '100%', maxWidth: 300, padding: 8}} />
                  </div>
                  <div style={{marginBottom: 10}}>
                    <label style={{display: 'block', marginBottom: 4}}>Nueva contraseña</label>
                    <input type="password" value={configPasswordNueva} onChange={e => setConfigPasswordNueva(e.target.value)} required style={{width: '100%', maxWidth: 300, padding: 8}} />
                  </div>
                  <button type="submit" style={{padding: '8px 16px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}>Cambiar contraseña</button>
                  {configMsg && <p style={{color: '#28a745', marginTop: 8}}>{configMsg}</p>}
                  {configError && <p style={{color: '#dc3545', marginTop: 8}}>{configError}</p>}
                </form>

                {puedeAdministrar && (
                  <>
                    <h3 style={{color: '#1976d2', marginTop: 30}}>Gestión de usuarios</h3>
                    <button onClick={() => { setConfigError(''); handleConfigAbrirModalUsuario(null); }} style={{marginBottom: 16, padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}>+ Crear usuario</button>
                    {loadingUsuarios && <p>Cargando...</p>}
                    {!loadingUsuarios && listaUsuarios.length > 0 && (
                      <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 8}}>
                        <thead>
                          <tr style={{backgroundColor: tablaHeaderBg}}>
                            <th style={{padding: 10, textAlign: 'center', border: '1px solid #dee2e6'}}>Usuario</th>
                            <th style={{padding: 10, textAlign: 'center', border: '1px solid #dee2e6'}}>Rol</th>
                            <th style={{padding: 10, textAlign: 'center', border: '1px solid #dee2e6'}}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listaUsuarios.map(u => (
                            <tr key={u.id}>
                              <td style={{padding: 10, border: '1px solid #dee2e6'}}>{u.username}</td>
                              <td style={{padding: 10, border: '1px solid #dee2e6'}}>{u.rol || 'usuario'}</td>
                              <td style={{padding: 10, border: '1px solid #dee2e6'}}>
                                <button type="button" onClick={() => { setConfigError(''); handleConfigAbrirModalUsuario(u); }} style={{marginRight: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer'}}>Editar</button>
                                <button type="button" onClick={() => handleConfigEliminarUsuario(u.id)} style={{padding: '4px 10px', fontSize: 12, backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}>Eliminar</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {!loadingUsuarios && listaUsuarios.length === 0 && vista === 'configuracion' && (
                      <p style={{color: '#666'}}>No hay usuarios. Haz clic en "Crear usuario".</p>
                    )}

                    {configUsuarioModal !== null && (
                      <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
                        <div style={{backgroundColor: '#fff', padding: 24, borderRadius: 8, maxWidth: 400, width: '90%'}}>
                          <h4>{configUsuarioModal && configUsuarioModal.id ? 'Editar usuario' : 'Crear usuario'}</h4>
                          <form onSubmit={handleConfigGuardarUsuario}>
                            <div style={{marginBottom: 10}}>
                              <label style={{display: 'block', marginBottom: 4}}>Usuario</label>
                              <input type="text" value={configUsuarioForm.username} onChange={e => setConfigUsuarioForm(f => ({ ...f, username: e.target.value }))} required style={{width: '100%', padding: 8}} />
                            </div>
                            <div style={{marginBottom: 10}}>
                              <label style={{display: 'block', marginBottom: 4}}>Contraseña {configUsuarioModal && configUsuarioModal.id ? '(dejar vacío para no cambiar)' : ''}</label>
                              <input type="password" value={configUsuarioForm.password} onChange={e => setConfigUsuarioForm(f => ({ ...f, password: e.target.value }))} style={{width: '100%', padding: 8}} {...(!configUsuarioModal || !configUsuarioModal.id ? { required: true } : {})} />
                            </div>
                            <div style={{marginBottom: 10}}>
                              <label style={{display: 'block', marginBottom: 4}}>Rol</label>
                              <select value={configUsuarioForm.rol} onChange={e => setConfigUsuarioForm(f => ({ ...f, rol: e.target.value }))} style={{width: '100%', padding: 8}}>
                                <option value="usuario">Usuario</option>
                                <option value="admin">Administrador</option>
                              </select>
                            </div>
                            {configError && <p style={{color: '#dc3545', marginBottom: 8}}>{configError}</p>}
                            <div style={{display: 'flex', gap: 10, marginTop: 16}}>
                              <button type="submit" style={{padding: '8px 16px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}>Guardar</button>
                              <button type="button" onClick={handleConfigCerrarModalUsuario} style={{padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}>Cancelar</button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {vista === 'tasa-ausencia-intersemestral' && (
              <div style={{padding: 20}}>
                {loadingTasaAusencia && <p>Cargando períodos...</p>}
                {errorTasaAusencia && <p style={{color: 'red'}}>{errorTasaAusencia}</p>}
                {!loadingTasaAusencia && !errorTasaAusencia && periodosTasaAusencia.length > 0 && (
                  <div style={{marginTop: 20}}>
                    <div style={{display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="periodoTasaAusencia" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Período:
                        </label>
                        <select 
                          id="periodoTasaAusencia" 
                          value={periodoSeleccionadoTasaAusencia} 
                          onChange={handlePeriodoTasaAusenciaChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #1976d2',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '200px'
                          }}
                        >
                          <option value="">-- Seleccionar período --</option>
                          {periodosTasaAusencia.map((periodo) => (
                            <option key={periodo} value={periodo}>{periodo}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <label htmlFor="programaTasaAusencia" style={{fontWeight: 'bold', fontSize: '16px'}}>
                          Programa:
                        </label>
                        <select 
                          id="programaTasaAusencia" 
                          value={programaSeleccionadoTasaAusencia} 
                          onChange={handleProgramaTasaAusenciaChange}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '2px solid #43a047',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            minWidth: '250px'
                          }}
                        >
                          <option value="">-- Todos --</option>
                          {programasTasaAusencia.map((programa) => (
                            <option key={programa} value={programa}>{programa}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Sección de cálculo de tasa de ausencia intersemestral */}
                    {periodosTasaAusencia.length > 0 && (
                      <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        border: '2px solid #6c757d',
                        borderRadius: '10px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: '0', color: '#495057'}}>
                            Cálculo de Tasa de Ausencia Intersemestral (TAI)
                          </h3>
                          <button
                            onClick={() => {
                              const periodoActual = periodoSeleccionadoTasaAusencia || (periodosTasaAusencia.length > 0 ? periodosTasaAusencia[0] : '');
                              const programaActual = programaSeleccionadoTasaAusencia || '';
                              calcularTasaAusenciaIntersemestral(token, periodoActual, programaActual);
                            }}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Actualizar
                          </button>
                        </div>
                        
                        {/* Fórmula visual */}
                        <div style={{
                          textAlign: 'center',
                          marginBottom: '30px',
                          padding: '20px',
                          backgroundColor: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px'
                        }}>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            gap: '5px'
                          }}>
                            <span>TAI<sub>t</sub> = (</span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '20px'
                            }}>
                              <span>Ausencias intersemestrales de t / Matriculados en t - 1</span>
                            </div>
                            <span>) * 100</span>
                          </div>
                          <div style={{fontSize: '14px', color: '#6c757d', marginTop: '10px'}}>
                            Donde t es el período
                          </div>
                        </div>

                        {/* Datos del cálculo */}
                        {loadingCalculoTasaAusencia ? (
                          <div style={{textAlign: 'center', padding: '20px'}}>
                            <p>Cargando datos para el cálculo...</p>
                          </div>
                        ) : errorCalculoTasaAusencia ? (
                          <div style={{textAlign: 'center', padding: '20px', color: '#dc3545'}}>
                            <p>Error al calcular la tasa de ausencia intersemestral: {errorCalculoTasaAusencia}</p>
                          </div>
                        ) : datosTasaAusencia ? (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            marginTop: '20px'
                          }}>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#dc3545'}}>Ausencias</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#dc3545',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickAusenciaIntersemestral}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#f8d7da';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de ausencias intersemestrales"
                              >
                                {datosTasaAusencia.ausencias}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                Período {datosTasaAusencia.periodo}
                              </div>
                              <div style={{fontSize: '12px', color: '#dc3545', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#007bff'}}>Matriculados</h4>
                              <div 
                                style={{
                                  fontSize: '32px', 
                                  fontWeight: 'bold', 
                                  color: '#007bff',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  padding: '10px',
                                  borderRadius: '4px'
                                }}
                                onClick={handleClickMatriculados}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#e3f2fd';
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title="Hacer clic para ver la lista de matriculados"
                              >
                                {datosTasaAusencia.matriculados}
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                Período {datosTasaAusencia.periodoConsulta}
                              </div>
                              <div style={{fontSize: '12px', color: '#007bff', marginTop: '5px'}}>
                                (Hacer clic para ver detalles)
                              </div>
                            </div>
                            <div style={{
                              padding: '15px',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <h4 style={{margin: '0 0 10px 0', color: '#28a745'}}>Tasa</h4>
                              <div style={{
                                fontSize: '32px', 
                                fontWeight: 'bold', 
                                color: '#28a745'
                              }}>
                                {datosTasaAusencia.tasa}%
                              </div>
                              <div style={{fontSize: '14px', color: '#6c757d'}}>
                                {datosTasaAusencia.programa}
                              </div>
                            </div>
                          </div>
                        ) : !programaSeleccionadoTasaAusencia ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            backgroundColor: '#d1ecf1',
                            border: '1px solid #bee5eb',
                            borderRadius: '8px',
                            color: '#0c5460'
                          }}>
                            <p style={{margin: '0', fontSize: '16px', fontWeight: 'bold'}}>
                              Calculando para TODOS los programas
                            </p>
                            <p style={{margin: '5px 0 0 0', fontSize: '14px'}}>
                              Selecciona un programa específico para ver el cálculo individual
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
                {!loadingTasaAusencia && !errorTasaAusencia && periodosTasaAusencia.length === 0 && (
                  <p>No se encontraron períodos disponibles.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de lista de desertores */}
      {mostrarModalDesertores && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '80%',
            maxHeight: '80%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #dc3545',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#dc3545'}}>
                Lista de Desertores ({listaDesertores.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaDesertores, 'desertores')}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalDesertores(false)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período:</strong> {mostrarModalTasaDesercionGrafico ? tasaDesercionGraficoModalContext.periodo : datosTasaDesercion?.periodo} |
              <strong> Programa:</strong> {mostrarModalTasaDesercionGrafico ? (tasaDesercionGraficoModalContext.programa || 'TODOS') : datosTasaDesercion?.programa}
              {mostrarModalTasaDesercionGrafico && tasaDesercionGraficoModalContext.facultad ? (
                <>
                  {' '}| <strong>Facultad:</strong> {tasaDesercionGraficoModalContext.facultad}
                </>
              ) : null}
              {mostrarModalTasaDesercionGrafico && tasaDesercionGraficoModalContext.nivel ? (
                <>
                  {' '}| <strong>Nivel:</strong> {tasaDesercionGraficoModalContext.nivel}
                </>
              ) : null}
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingDesertores ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de desertores...</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>NombrePeriodo</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaDesertores.map((desertor, index) => (
                      <tr key={desertor.id} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{index + 1}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>
                          {desertor.nombre}
                        </td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.periodoSiguiente}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalDesertores(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de lista de matriculados */}
      {mostrarModalAusenciaIntersemestral && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '90%',
            maxHeight: '90%',
            width: '1200px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0}}>
              <h2 style={{margin: 0}}>Lista de Ausencias Intersemestrales ({listaAusenciaIntersemestral.length})</h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaAusenciaIntersemestral, 'ausencias_intersemestrales', columnasMatriculadosPermitidas)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalAusenciaIntersemestral(false)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingAusenciaIntersemestralModal ? (
                <p>Cargando...</p>
              ) : (
                <table border="1" style={{width: 'max-content', minWidth: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Periodo Ingreso</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Periodo Siguiente</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaAusenciaIntersemestral.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.nombre}</td>
                        <td>{item.codigo}</td>
                        <td>{item.programa}</td>
                        <td>{item.facultad}</td>
                        <td>{item.nivel}</td>
                        <td>{item.periodoIngreso}</td>
                        <td>{item.estadoMatricula}</td>
                        <td>{item.estadoEstudiante}</td>
                        <td>{item.periodoSiguiente}</td>
                        <td>{item.tipodocumento}</td>
                        <td>{item.documento}</td>
                        <td>{item.telefonoppal}</td>
                        <td>{item.celular}</td>
                        <td>{item.correounac}</td>
                        <td>{item.correootro}</td>
                        <td>{item.muniprocedencia}</td>
                        <td>{item.dptoprocedencia}</td>
                        <td>{item.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalAusenciaIntersemestral(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalMatriculadosAusencia && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #007bff',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#007bff'}}>
                Lista de Matriculados ({listaMatriculadosAusencia.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaMatriculadosAusencia, 'matriculados_ausencia_intersemestral', columnasMatriculadosPermitidas.filter(c => c !== 'periodoSiguiente'))}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalMatriculadosAusencia(false)}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', flexShrink: 0}}>
              <p style={{margin: 0, fontSize: '14px', color: '#6c757d'}}>
                <strong>Período ausencia:</strong> {tasaAusenciaGraficoModalContext.periodo || periodoSeleccionadoTasaAusencia || 'No seleccionado'} |
                <strong> Matriculados (t-1):</strong> {getPeriodoAnterior1(tasaAusenciaGraficoModalContext.periodo || periodoSeleccionadoTasaAusencia || '')} |
                <strong> Programa:</strong> {tasaAusenciaGraficoModalContext.programa || programaSeleccionadoTasaAusencia || 'Todos los programas'}
              </p>
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingMatriculadosAusencia ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de matriculados...</p>
                </div>
              ) : listaMatriculadosAusencia.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron matriculados.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaMatriculadosAusencia.map((item, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.id}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>{item.nombre}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {mostrarModalMatriculados && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #007bff',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#007bff'}}>
                Lista de Matriculados ({listaMatriculados.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => {
                    const headers = columnasMatriculadosPermitidas;
                    exportarCSV(listaMatriculados, 'matriculados_tasa_desercion', headers);
                  }}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalMatriculados(false)}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período de deserción:</strong> {datosTasaDesercion?.periodo} | 
              <strong> Período de matriculados (t-2):</strong> {datosTasaDesercion?.periodoConsulta} | 
              <strong> Programa:</strong> {datosTasaDesercion?.programa}
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingMatriculados ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de matriculados...</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      {/* Misma estructura de columnas que desertores */}
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>NombrePeriodo</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaMatriculados.map((matricula, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{index + 1}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>{matricula.nombre}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.periodoSiguiente}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalMatriculados(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de lista de primíparos por cohorte */}
      {mostrarModalPrimiparosCohorte && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #17a2b8',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#17a2b8'}}>
                Lista de Primíparos ({listaPrimiparosCohorte.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaPrimiparosCohorte, 'primiparos_cohorte', columnasMatriculadosPermitidas.filter(c => c !== 'periodoSiguiente'))}
                  style={{
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalPrimiparosCohorte(false)}
                  style={{
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', flexShrink: 0}}>
              <p style={{margin: 0, fontSize: '14px', color: '#6c757d'}}>
                <strong>Cohorte:</strong> {cohorteSeleccionada || 'No seleccionada'} | 
                <strong> Programa:</strong> {programaSeleccionadoCohorte || 'Todos los programas'}
              </p>
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingPrimiparosCohorte ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de primíparos...</p>
                </div>
              ) : listaPrimiparosCohorte.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron primíparos para la cohorte seleccionada.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Siguiente</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaPrimiparosCohorte.map((primiparo, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{index + 1}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>{primiparo.nombre}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.periodoSiguiente}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalPrimiparosCohorte(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalGraduados && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #28a745',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#28a745'}}>
                Lista de Graduados ({listaGraduadosModal.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaGraduadosModal, 'graduados', columnasMatriculadosPermitidas.filter(c => c !== 'periodoSiguiente'))}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalGraduados(false)}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', flexShrink: 0}}>
              <p style={{margin: 0, fontSize: '14px', color: '#6c757d'}}>
                <strong>Período:</strong> {ultimosParametrosTasaGraduacion?.periodo || 'No seleccionado'} | 
                <strong> Programa:</strong> {ultimosParametrosTasaGraduacion?.programa || 'Todos los programas'}
              </p>
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingGraduadosModal ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de graduados...</p>
                </div>
              ) : listaGraduadosModal.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron graduados.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Egreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaGraduadosModal.map((graduado, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{index + 1}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>{graduado.nombre}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.periodoEgreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{graduado.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalGraduados(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalPrimiparosGraduacion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #17a2b8',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#17a2b8'}}>
                Lista de Primíparos ({listaPrimiparosGraduacion.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaPrimiparosGraduacion, 'primiparos_graduacion', columnasMatriculadosPermitidas.filter(c => c !== 'periodoSiguiente'))}
                  style={{
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalPrimiparosGraduacion(false)}
                  style={{
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', flexShrink: 0}}>
              <p style={{margin: 0, fontSize: '14px', color: '#6c757d'}}>
                <strong>Período:</strong> {ultimosParametrosTasaGraduacion?.periodo || 'No seleccionado'} | 
                <strong> Programa:</strong> {ultimosParametrosTasaGraduacion?.programa || 'Todos los programas'}
              </p>
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingPrimiparosGraduacion ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de primíparos...</p>
                </div>
              ) : listaPrimiparosGraduacion.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron primíparos.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaPrimiparosGraduacion.map((primiparo, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{index + 1}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>{primiparo.nombre}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{primiparo.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalPrimiparosGraduacion(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalPrimiparosPromedio && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #17a2b8',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#17a2b8'}}>
                Lista de Primíparos ({listaPrimiparosPromedio.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaPrimiparosPromedio, 'primiparos_desercion_promedio', columnasMatriculadosPermitidas.filter(c => c !== 'periodoSiguiente'))}
                  style={{
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalPrimiparosPromedio(false)}
                  style={{
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingPrimiparosPromedio ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de primíparos...</p>
                </div>
              ) : listaPrimiparosPromedio.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron primíparos.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaPrimiparosPromedio.map((item, index) => (
                      <tr key={index} style={{backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'}}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.id}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>{item.nombre}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de lista de desertores periodo 2.8 */}
      {mostrarModalDesertores28 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '80%',
            maxHeight: '80%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #dc3545',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#dc3545'}}>
                Lista de Desertores ({listaDesertores28.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaDesertores28, 'desertores_periodo_2_8')}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalDesertores28(false)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período:</strong> {datosTasaDesercion28?.periodo} | 
              <strong> Programa:</strong> {datosTasaDesercion28?.programa}
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingDesertores28 ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de desertores...</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>NombrePeriodo</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaDesertores28.map((desertor, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.id}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>
                          {desertor.nombre}
                        </td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.nombrePeriodo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{desertor.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalDesertores28(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de lista de matriculados no graduados periodo 2.8 */}
      {mostrarModalMatriculados28 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #007bff',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#007bff'}}>
                Lista de Matriculados No Graduados ({listaMatriculados28.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => {
                    const headers = columnasMatriculadosPermitidas;
                    exportarCSV(listaMatriculados28, 'matriculados_no_graduados_periodo_2_8', headers);
                  }}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalMatriculados28(false)}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período de deserción:</strong> {datosTasaDesercion28?.periodo} | 
              <strong> Período de matriculados (t-2):</strong> {datosTasaDesercion28?.periodoConsulta} | 
              <strong> Programa:</strong> {datosTasaDesercion28?.programa}
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingMatriculados28 ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de matriculados no graduados...</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>NombrePeriodo</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaMatriculados28.map((matricula, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.id}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>
                          {matricula.nombre}
                        </td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.nombrePeriodo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{matricula.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalMatriculados28(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalMatriculadosSupervivencia && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #007bff',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#007bff'}}>
                Lista de Matriculados ({listaMatriculadosSupervivencia.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaMatriculadosSupervivencia, 'matriculados_supervivencia', columnasMatriculadosPermitidas.filter(c => c !== 'periodoSiguiente'))}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalMatriculadosSupervivencia(false)}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', flexShrink: 0}}>
              <p style={{margin: 0, fontSize: '14px', color: '#6c757d'}}>
                <strong>Período:</strong> {ultimosParametrosTasaSupervivencia?.periodo || 'No seleccionado'} | 
                <strong> Programa:</strong> {ultimosParametrosTasaSupervivencia?.programa || 'Todos los programas'}
              </p>
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingMatriculadosSupervivencia ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de matriculados...</p>
                </div>
              ) : listaMatriculadosSupervivencia.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron matriculados.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaMatriculadosSupervivencia.map((item, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.id}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>{item.nombre}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalMatriculadosSupervivencia(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {mostrarModalPrimiparosSupervivencia && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #17a2b8',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#17a2b8'}}>
                Lista de Primíparos ({listaPrimiparosSupervivencia.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaPrimiparosSupervivencia, 'primiparos_supervivencia', columnasMatriculadosPermitidas.filter(c => c !== 'periodoSiguiente'))}
                  style={{
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalPrimiparosSupervivencia(false)}
                  style={{
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', flexShrink: 0}}>
              <p style={{margin: 0, fontSize: '14px', color: '#6c757d'}}>
                <strong>Período:</strong> {ultimosParametrosTasaSupervivencia?.periodo || 'No seleccionado'} | 
                <strong> Programa:</strong> {ultimosParametrosTasaSupervivencia?.programa || 'Todos los programas'}
              </p>
            </div>

            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingPrimiparosSupervivencia ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando lista de primíparos...</p>
                </div>
              ) : listaPrimiparosSupervivencia.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron primíparos.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaPrimiparosSupervivencia.map((item, index) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.id}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold'}}>{item.nombre}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.codigo}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.programa}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.facultad}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.nivel}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.periodoIngreso}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.estadoMatricula}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.estadoEstudiante}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.tipodocumento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.documento}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.telefonoppal}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.celular}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.correounac}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.correootro}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.muniprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.dptoprocedencia}</td>
                        <td style={{padding: '12px', border: '1px solid #dee2e6'}}>{item.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setMostrarModalPrimiparosSupervivencia(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {mostrarModalMatriculasGraficos && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #007bff',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#007bff'}}>
                Datos de Matrículas ({listaMatriculasGraficos.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaMatriculasGraficos, 'matriculas_graficos')}
                  disabled={loadingMatriculasGraficos || listaMatriculasGraficos.length === 0}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: loadingMatriculasGraficos || listaMatriculasGraficos.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: loadingMatriculasGraficos || listaMatriculasGraficos.length === 0 ? 0.6 : 1
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalMatriculasGraficos(false)}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingMatriculasGraficos ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando matrículas...</p>
                </div>
              ) : errorMatriculasGraficos ? (
                <div style={{textAlign: 'center', padding: '40px', color: 'red'}}>
                  <p>{errorMatriculasGraficos}</p>
                </div>
              ) : listaMatriculasGraficos.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron matrículas.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaMatriculasGraficos.map((matricula, idx) => (
                      <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa'}}>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{idx + 1}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.NombrePeriodo}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.PROGRAMA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.facultad || matricula.FACULTAD}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.ESTUDIANTE}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.CODIGO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.ESTADOMATRICULA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.NIVEL}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.PERINGRESO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.EstadoEstudiante}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.tipodocumento || matricula.TIPODOCUMENTO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.documento || matricula.DOCUMENTO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.telefonoppal || matricula.TELEFONOPPAL}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.celular || matricula.CELULAR}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.correounac || matricula.CORREOUNAC}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.correootro || matricula.CORREOOTRO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.muniprocedencia || matricula.MUNIPROCEDENCIA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.dptoprocedencia || matricula.DPTOPROCEDENCIA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{matricula.paisprocedencia || matricula.PAISPROCEDENCIA}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {mostrarModalDesercionGraficos && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #c62828',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#c62828'}}>
                Datos de Deserción ({listaDesercionGraficos.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaDesercionGraficos, 'desercion_graficos')}
                  disabled={loadingDesercionGraficos || listaDesercionGraficos.length === 0}
                  style={{
                    backgroundColor: '#c62828',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: loadingDesercionGraficos || listaDesercionGraficos.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: loadingDesercionGraficos || listaDesercionGraficos.length === 0 ? 0.6 : 1
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalDesercionGraficos(false)}
                  style={{
                    background: '#c62828',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingDesercionGraficos ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando deserción...</p>
                </div>
              ) : errorDesercionGraficos ? (
                <div style={{textAlign: 'center', padding: '40px', color: 'red'}}>
                  <p>{errorDesercionGraficos}</p>
                </div>
              ) : listaDesercionGraficos.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron registros de deserción.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaDesercionGraficos.map((item, idx) => (
                      <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa'}}>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{idx + 1}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.periodoSiguiente}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.programa}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.facultad}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.estudiante}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.codigo}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.estadomatricula}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.nivel}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.peringreso}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.estadoEstudiante}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.tipodocumento}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.documento}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.telefonoppal}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.celular}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.correounac}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.correootro}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.muniprocedencia}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.dptoprocedencia}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {mostrarModalPrimiparosGraficos && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #0097a7',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#0097a7'}}>
                Datos de Primíparos ({listaPrimiparosGraficos.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaPrimiparosGraficos, 'primiparos_graficos')}
                  disabled={loadingPrimiparosGraficos || listaPrimiparosGraficos.length === 0}
                  style={{
                    backgroundColor: '#0097a7',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: loadingPrimiparosGraficos || listaPrimiparosGraficos.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: loadingPrimiparosGraficos || listaPrimiparosGraficos.length === 0 ? 0.6 : 1
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalPrimiparosGraficos(false)}
                  style={{
                    background: '#0097a7',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingPrimiparosGraficos ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando primíparos...</p>
                </div>
              ) : errorPrimiparosGraficos ? (
                <div style={{textAlign: 'center', padding: '40px', color: 'red'}}>
                  <p>{errorPrimiparosGraficos}</p>
                </div>
              ) : listaPrimiparosGraficos.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron primíparos.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaPrimiparosGraficos.map((primiparo, idx) => (
                      <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa'}}>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{idx + 1}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.NombrePeriodo}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.PROGRAMA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.facultad || primiparo.FACULTAD}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.ESTUDIANTE}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.CODIGO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.ESTADOMATRICULA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.NIVEL}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.PERINGRESO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.EstadoEstudiante}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.tipodocumento || primiparo.TIPODOCUMENTO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.documento || primiparo.DOCUMENTO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.telefonoppal || primiparo.TELEFONOPPAL}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.celular || primiparo.CELULAR}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.correounac || primiparo.CORREOUNAC}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.correootro || primiparo.CORREOOTRO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.muniprocedencia || primiparo.MUNIPROCEDENCIA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.dptoprocedencia || primiparo.DPTOPROCEDENCIA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{primiparo.paisprocedencia || primiparo.PAISPROCEDENCIA}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {mostrarModalGraduadosGraficos && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #5e35b1',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#5e35b1'}}>
                Datos de Graduados ({listaGraduadosGraficos.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaGraduadosGraficos, 'graduados_graficos')}
                  disabled={loadingGraduadosGraficos || listaGraduadosGraficos.length === 0}
                  style={{
                    backgroundColor: '#5e35b1',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: loadingGraduadosGraficos || listaGraduadosGraficos.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: loadingGraduadosGraficos || listaGraduadosGraficos.length === 0 ? 0.6 : 1
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalGraduadosGraficos(false)}
                  style={{
                    background: '#5e35b1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingGraduadosGraficos ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando graduados...</p>
                </div>
              ) : errorGraduadosGraficos ? (
                <div style={{textAlign: 'center', padding: '40px', color: 'red'}}>
                  <p>{errorGraduadosGraficos}</p>
                </div>
              ) : listaGraduadosGraficos.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron graduados.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaGraduadosGraficos.map((graduado, idx) => (
                      <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa'}}>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{idx + 1}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.NombrePeriodo}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.PROGRAMA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.facultad || graduado.FACULTAD}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.ESTUDIANTE}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.CODIGO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.ESTADOMATRICULA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.NIVEL}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.PERINGRESO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.EstadoEstudiante}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.tipodocumento || graduado.TIPODOCUMENTO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.documento || graduado.DOCUMENTO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.telefonoppal || graduado.TELEFONOPPAL}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.celular || graduado.CELULAR}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.correounac || graduado.CORREOUNAC}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.correootro || graduado.CORREOOTRO}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.muniprocedencia || graduado.MUNIPROCEDENCIA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.dptoprocedencia || graduado.DPTOPROCEDENCIA}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{graduado.paisprocedencia || graduado.PAISPROCEDENCIA}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {mostrarModalAusenciaGraficos && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #ef6c00',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#ef6c00'}}>
                Datos de Ausencia intersemestral ({listaAusenciaGraficos.length})
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => exportarCSV(listaAusenciaGraficos, 'ausencia_intersemestral_graficos')}
                  disabled={loadingAusenciaGraficos || listaAusenciaGraficos.length === 0}
                  style={{
                    backgroundColor: '#ef6c00',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: loadingAusenciaGraficos || listaAusenciaGraficos.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: loadingAusenciaGraficos || listaAusenciaGraficos.length === 0 ? 0.6 : 1
                  }}
                  title="Exportar datos a CSV"
                >
                  📊 Exportar CSV
                </button>
                <button
                  onClick={() => setMostrarModalAusenciaGraficos(false)}
                  style={{
                    background: '#ef6c00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1, minHeight: 0}}>
              {loadingAusenciaGraficos ? (
                <div style={{textAlign: 'center', padding: '40px'}}>
                  <p>Cargando ausencia intersemestral...</p>
                </div>
              ) : errorAusenciaGraficos ? (
                <div style={{textAlign: 'center', padding: '40px', color: 'red'}}>
                  <p>{errorAusenciaGraficos}</p>
                </div>
              ) : listaAusenciaGraficos.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#6c757d'}}>
                  <p>No se encontraron registros de ausencia intersemestral.</p>
                </div>
              ) : (
                <table style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #dee2e6'
                }}>
                  <thead>
                    <tr style={{backgroundColor: '#f8f9fa'}}>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>#</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nombre Período</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Programa</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Facultad</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Código</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Matrícula</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Nivel</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Período Ingreso</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Estado Estudiante</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Tipo Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Documento</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Teléfono Principal</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Celular</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo UNAC</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Correo Otro</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Municipio Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>Departamento Procedencia</th>
                      <th style={{padding: '10px', border: '1px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)'}}>País Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaAusenciaGraficos.map((item, idx) => (
                      <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa'}}>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{idx + 1}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.periodoSiguiente}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.programa}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.facultad}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.estudiante}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.codigo}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.estadomatricula}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.nivel}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.peringreso}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.estadoEstudiante}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.tipodocumento}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.documento}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.telefonoppal}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.celular}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.correounac}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.correootro}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.muniprocedencia}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.dptoprocedencia}</td>
                        <td style={{padding: '10px', border: '1px solid #dee2e6'}}>{item.paisprocedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {mostrarModalTasaDesercionGrafico && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #2e7d32',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#2e7d32'}}>
                Tasa de Deserción Anual
              </h2>
              <button
                onClick={() => setMostrarModalTasaDesercionGrafico(false)}
                style={{
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            <div style={{overflowY: 'auto'}}>
              {renderTasaDesercionCalculo({
                periodoActual: tasaDesercionGraficoModalContext.periodo,
                programaActual: tasaDesercionGraficoModalContext.programa || '',
                onActualizar: () => {
                  const programaActual = tasaDesercionGraficoModalContext.programa || '';
                  const facultadActual = tasaDesercionGraficoModalContext.facultad || '';
                  const nivelActual = tasaDesercionGraficoModalContext.nivel || '';
                  calcularTasaDesercion(token, tasaDesercionGraficoModalContext.periodo, programaActual, facultadActual, nivelActual);
                }
              })}
            </div>
          </div>
        </div>
      )}
      {mostrarModalTasaDesercionCohorteGrafico && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #17a2b8',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#17a2b8'}}>
                Tasa de Deserción por Cohorte
              </h2>
              <button
                onClick={() => {
                  setMostrarModalTasaDesercionCohorteGrafico(false);
                  setTasaDesercionCohorteGraficoModalContext({
                    cohorte: null,
                    programa: '',
                    facultad: '',
                    nivel: '',
                    semestre: ''
                  });
                }}
                style={{
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Cohorte:</strong> {tasaDesercionCohorteGraficoModalContext.cohorte} |
              <strong> Programa:</strong> {tasaDesercionCohorteGraficoModalContext.programa || 'TODOS'}
              {tasaDesercionCohorteGraficoModalContext.facultad ? (
                <>
                  {' '}| <strong>Facultad:</strong> {tasaDesercionCohorteGraficoModalContext.facultad}
                </>
              ) : null}
              {tasaDesercionCohorteGraficoModalContext.nivel ? (
                <>
                  {' '}| <strong>Nivel:</strong> {tasaDesercionCohorteGraficoModalContext.nivel}
                </>
              ) : null}
            </div>
            <div style={{overflowY: 'auto'}}>
              {renderTasaDesercionCohorteCalculo({
                cohorteActual: tasaDesercionCohorteGraficoModalContext.cohorte,
                programaActual: tasaDesercionCohorteGraficoModalContext.programa || '',
                semestreActual: tasaDesercionCohorteGraficoModalContext.semestre || '',
                onActualizar: () => {
                  const programaActual = tasaDesercionCohorteGraficoModalContext.programa || '';
                  const facultadActual = tasaDesercionCohorteGraficoModalContext.facultad || '';
                  const nivelActual = tasaDesercionCohorteGraficoModalContext.nivel || '';
                  const semestreActual = tasaDesercionCohorteGraficoModalContext.semestre || '';
                  calcularTasaDesercionCohorte(token, tasaDesercionCohorteGraficoModalContext.cohorte, programaActual, semestreActual, facultadActual, nivelActual);
                }
              })}
            </div>
          </div>
        </div>
      )}
      {mostrarModalTasaDesercionPromedioGrafico && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #2e7d32',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#2e7d32'}}>Tasa de Deserción Promedio Acumulada</h2>
              <button
                onClick={() => setMostrarModalTasaDesercionPromedioGrafico(false)}
                style={{
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período:</strong> {tasaDesercionPromedioGraficoModalContext.periodo} |
              <strong> Programa:</strong> {tasaDesercionPromedioGraficoModalContext.programa || 'TODOS'}
            </div>
            <div style={{overflowY: 'auto'}}>
              {renderTasaDesercionPromedioResumen({
                periodoActual: tasaDesercionPromedioGraficoModalContext.periodo,
                programaActual: tasaDesercionPromedioGraficoModalContext.programa || '',
                onActualizar: () => {
                  calcularTasaDesercionPromedio(
                    token,
                    tasaDesercionPromedioGraficoModalContext.periodo,
                    tasaDesercionPromedioGraficoModalContext.programa || '',
                    tasaDesercionPromedioGraficoModalContext.facultad || '',
                    tasaDesercionPromedioGraficoModalContext.nivel || ''
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}
      {mostrarModalTasaGraduacionGrafico && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #2e7d32',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#2e7d32'}}>Tasa de Graduación Acumulada</h2>
              <button
                onClick={() => setMostrarModalTasaGraduacionGrafico(false)}
                style={{
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período:</strong> {tasaGraduacionGraficoModalContext.periodo} |
              <strong> Programa:</strong> {tasaGraduacionGraficoModalContext.programa || 'TODOS'}
            </div>
            <div style={{overflowY: 'auto'}}>
              {renderTasaGraduacionResumen({
                periodoActual: tasaGraduacionGraficoModalContext.periodo,
                programaActual: tasaGraduacionGraficoModalContext.programa || '',
                onActualizar: () => {
                  calcularTasaGraduacion(
                    token,
                    tasaGraduacionGraficoModalContext.periodo,
                    tasaGraduacionGraficoModalContext.programa || '',
                    tasaGraduacionGraficoModalContext.facultad || '',
                    tasaGraduacionGraficoModalContext.nivel || ''
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}
      {mostrarModalTasaAusenciaGrafico && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #2e7d32',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#2e7d32'}}>Tasa de Ausencia Intersemestral</h2>
              <button
                onClick={() => setMostrarModalTasaAusenciaGrafico(false)}
                style={{
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período:</strong> {tasaAusenciaGraficoModalContext.periodo} |
              <strong> Programa:</strong> {tasaAusenciaGraficoModalContext.programa || 'TODOS'}
            </div>
            <div style={{overflowY: 'auto'}}>
              {renderTasaAusenciaResumen({
                periodoActual: tasaAusenciaGraficoModalContext.periodo,
                programaActual: tasaAusenciaGraficoModalContext.programa || '',
                onActualizar: () => {
                  calcularTasaAusenciaIntersemestral(
                    token,
                    tasaAusenciaGraficoModalContext.periodo,
                    tasaAusenciaGraficoModalContext.programa || '',
                    tasaAusenciaGraficoModalContext.facultad || '',
                    tasaAusenciaGraficoModalContext.nivel || ''
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}
      {mostrarModalTasaSupervivenciaGrafico && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #2e7d32',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#2e7d32'}}>Tasa de Supervivencia</h2>
              <button
                onClick={() => setMostrarModalTasaSupervivenciaGrafico(false)}
                style={{
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período:</strong> {tasaSupervivenciaGraficoModalContext.periodo} |
              <strong> Programa:</strong> {tasaSupervivenciaGraficoModalContext.programa || 'TODOS'}
            </div>
            <div style={{overflowY: 'auto'}}>
              {renderTasaSupervivenciaResumen({
                periodoActual: tasaSupervivenciaGraficoModalContext.periodo,
                programaActual: tasaSupervivenciaGraficoModalContext.programa || '',
                onActualizar: () => {
                  calcularTasaSupervivencia(
                    token,
                    tasaSupervivenciaGraficoModalContext.periodo,
                    tasaSupervivenciaGraficoModalContext.programa || '',
                    tasaSupervivenciaGraficoModalContext.facultad || '',
                    tasaSupervivenciaGraficoModalContext.nivel || ''
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}
      {mostrarModalTasaDesercion28Grafico && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #2e7d32',
              paddingBottom: '10px',
              flexShrink: 0
            }}>
              <h2 style={{margin: 0, color: '#2e7d32'}}>Tasa de Deserción Periodo 2.8</h2>
              <button
                onClick={() => setMostrarModalTasaDesercion28Grafico(false)}
                style={{
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            <div style={{marginBottom: '20px', color: '#666', flexShrink: 0}}>
              <strong>Período:</strong> {tasaDesercion28GraficoModalContext.periodo} |
              <strong> Programa:</strong> {tasaDesercion28GraficoModalContext.programa || 'TODOS'}
            </div>
            <div style={{overflowY: 'auto'}}>
              {renderTasaDesercion28Resumen({
                periodoActual: tasaDesercion28GraficoModalContext.periodo,
                programaActual: tasaDesercion28GraficoModalContext.programa || '',
                onActualizar: () => {
                  calcularTasaDesercion28(
                    token,
                    tasaDesercion28GraficoModalContext.periodo,
                    tasaDesercion28GraficoModalContext.programa || '',
                    tasaDesercion28GraficoModalContext.facultad || '',
                    tasaDesercion28GraficoModalContext.nivel || ''
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
