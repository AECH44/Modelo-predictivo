const pool = require('../db');
const path = require('path');
const { spawn } = require('child_process');

// Utilidad para obtener el siguiente periodo
function getNextPeriodo(periodo) {
  const [anio, sem] = periodo.split('-').map(Number);
  if (sem === 1) return `${anio}-2`;
  return `${anio + 1}-1`;
}

// Utilidad para obtener todos los periodos posibles entre dos periodos
function getPeriodosEntre(inicio, fin) {
  const periodos = [];
  let actual = inicio;
  while (actual !== fin) {
    actual = getNextPeriodo(actual);
    periodos.push(actual);
  }
  return periodos;
}

function getPeriodoAnterior2(periodo) {
  const [anio, sem] = periodo.split('-').map(Number);
  if (sem === 1) return `${anio - 1}-1`;
  return `${anio - 1}-2`;
}

function getPeriodoAnterior1(periodo) {
  const [anio, sem] = periodo.split('-').map(Number);
  if (sem === 1) return `${anio - 1}-2`;
  return `${anio}-${sem - 1}`;
}

const getAllPeriodos = async () => {
  const [rows] = await pool.promise().query('SELECT DISTINCT NombrePeriodo as periodo FROM matriculas ORDER BY NombrePeriodo');
  return rows.map((row) => row.periodo);
};

const getMaxPeriodo = async () => {
  const [rows] = await pool.promise().query('SELECT MAX(NombrePeriodo) as maxPeriodo FROM matriculas');
  return rows[0]?.maxPeriodo || null;
};

const buildMatriculadosWhere = ({ periodo, programa, facultad, nivel, conCancelados }) => {
  const conditions = [];
  const params = [];
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;

  if (!incluirCancelados) {
    conditions.push('EstadoMatricula = ?');
    params.push('APROBADA');
  }
  if (periodo) {
    conditions.push('NombrePeriodo = ?');
    params.push(periodo);
  }
  if (programa) {
    conditions.push('programa = ?');
    params.push(programa);
  }
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (nivel) {
    conditions.push('nivel = ?');
    params.push(nivel);
  }

  return {
    where: conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

const countDesertores = async ({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo = false, sinPeriodo = false }) => {
  const baseSql = buildDesercionBaseSql({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo });
  const [rows] = await pool.promise().query(`SELECT COUNT(*) as cantidad ${baseSql}`);
  return rows[0]?.cantidad || 0;
};

const countAusencias = async ({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo = false, sinPeriodo = false }) => {
  const baseSql = buildAusenciaBaseSql({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo });
  const [rows] = await pool.promise().query(`SELECT COUNT(*) as cantidad ${baseSql}`);
  return rows[0]?.cantidad || 0;
};

const countPrimiparosAcumulados = async ({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo = false }) => {
  if (!periodo) {
    return 0;
  }
  const periodoLimite = hastaPeriodo ? periodo : getPeriodoAnterior2(periodo);
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;

  let sql = `SELECT COUNT(*) as cantidad FROM (
    SELECT DISTINCT m1.PROGRAMA, m1.CODIGO, m1.ESTUDIANTE, m1.PERINGRESO, m1.NombrePeriodo as primerPeriodo, m1.NIVEL, m1.ESTADOMATRICULA, m1.ESTADOESTUDIANTE, m1.tipodocumento, m1.documento, m1.telefonoppal, m1.celular, m1.correounac, m1.correootro, m1.muniprocedencia, m1.dptoprocedencia, m1.paisprocedencia
    FROM matriculas m1
    INNER JOIN (
      SELECT PROGRAMA, CODIGO, MIN(NombrePeriodo) as primerPeriodo
      FROM matriculas
      WHERE PERINGRESO <= ?`;

  const subParams = [periodoLimite];
  if (programa) {
    sql += ' AND PROGRAMA = ?';
    subParams.push(programa);
  }
  if (facultad) {
    sql += ' AND FACULTAD = ?';
    subParams.push(facultad);
  }
  if (nivel) {
    sql += ' AND NIVEL = ?';
    subParams.push(nivel);
  }

  sql += ` GROUP BY PROGRAMA, CODIGO
    ) m2 ON m1.PROGRAMA = m2.PROGRAMA AND m1.CODIGO = m2.CODIGO AND m1.NombrePeriodo = m2.primerPeriodo
    WHERE m1.PERINGRESO <= ?`;

  const params = [...subParams, periodoLimite];
  if (!incluirCancelados) {
    sql += ' AND m1.EstadoMatricula = ?';
    params.push('APROBADA');
  }
  if (programa) {
    sql += ' AND m1.PROGRAMA = ?';
    params.push(programa);
  }
  if (facultad) {
    sql += ' AND m1.FACULTAD = ?';
    params.push(facultad);
  }
  if (nivel) {
    sql += ' AND m1.NIVEL = ?';
    params.push(nivel);
  }
  sql += `) x`;

  const [rows] = await pool.promise().query(sql, params);
  return rows[0]?.cantidad || 0;
};

const countPrimiparosAcumuladosByGroup = async ({ periodo, programa, facultad, nivel, conCancelados, groupField, groupAlias, hastaPeriodo = false }) => {
  if (!periodo) {
    return [];
  }
  const periodoLimite = hastaPeriodo ? periodo : getPeriodoAnterior2(periodo);
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;

  let sql = `SELECT group_value as ${groupAlias}, COUNT(*) as primiparos FROM (
    SELECT DISTINCT m1.PROGRAMA, m1.CODIGO, m1.ESTUDIANTE, m1.PERINGRESO, m1.NombrePeriodo as primerPeriodo, m1.NIVEL, m1.ESTADOMATRICULA, m1.ESTADOESTUDIANTE, m1.tipodocumento, m1.documento, m1.telefonoppal, m1.celular, m1.correounac, m1.correootro, m1.muniprocedencia, m1.dptoprocedencia, m1.paisprocedencia, m1.${groupAlias} as group_value
    FROM matriculas m1
    INNER JOIN (
      SELECT PROGRAMA, CODIGO, MIN(NombrePeriodo) as primerPeriodo
      FROM matriculas
      WHERE PERINGRESO <= ?`;

  const subParams = [periodoLimite];
  if (programa) {
    sql += ' AND PROGRAMA = ?';
    subParams.push(programa);
  }
  if (facultad) {
    sql += ' AND FACULTAD = ?';
    subParams.push(facultad);
  }
  if (nivel) {
    sql += ' AND NIVEL = ?';
    subParams.push(nivel);
  }

  sql += ` GROUP BY PROGRAMA, CODIGO
    ) m2 ON m1.PROGRAMA = m2.PROGRAMA AND m1.CODIGO = m2.CODIGO AND m1.NombrePeriodo = m2.primerPeriodo
    WHERE m1.PERINGRESO <= ?`;

  const params = [...subParams, periodoLimite];
  if (!incluirCancelados) {
    sql += ' AND m1.EstadoMatricula = ?';
    params.push('APROBADA');
  }
  if (programa) {
    sql += ' AND m1.PROGRAMA = ?';
    params.push(programa);
  }
  if (facultad) {
    sql += ' AND m1.FACULTAD = ?';
    params.push(facultad);
  }
  if (nivel) {
    sql += ' AND m1.NIVEL = ?';
    params.push(nivel);
  }
  sql += `) x GROUP BY group_value`;

  const [rows] = await pool.promise().query(sql, params);
  return rows;
};

const countGraduadosAcumulados = async ({ periodo, programa, facultad, nivel, conCancelados }) => {
  if (!periodo) {
    return 0;
  }
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  let sql = `SELECT COUNT(*) as cantidad
    FROM matriculas m1
    INNER JOIN (
      SELECT documento, MAX(NombrePeriodo) as ultimoPeriodo
      FROM matriculas
      WHERE EstadoEstudiante = ? AND periodo_egreso <= ?`;
  const subParams = ['GRADUADO', periodo];
  if (programa) {
    sql += ' AND PROGRAMA = ?';
    subParams.push(programa);
  }
  if (facultad) {
    sql += ' AND FACULTAD = ?';
    subParams.push(facultad);
  }
  if (nivel) {
    sql += ' AND NIVEL = ?';
    subParams.push(nivel);
  }
  sql += ` GROUP BY documento
    ) m2 ON m1.documento = m2.documento AND m1.NombrePeriodo = m2.ultimoPeriodo
    WHERE m1.EstadoEstudiante = ? AND m1.periodo_egreso <= ?`;
  const params = [...subParams, 'GRADUADO', periodo];
  if (!incluirCancelados) {
    sql += ' AND m1.EstadoMatricula = ?';
    params.push('APROBADA');
  }
  if (programa) {
    sql += ' AND m1.PROGRAMA = ?';
    params.push(programa);
  }
  if (facultad) {
    sql += ' AND m1.FACULTAD = ?';
    params.push(facultad);
  }
  if (nivel) {
    sql += ' AND m1.NIVEL = ?';
    params.push(nivel);
  }
  const [rows] = await pool.promise().query(sql, params);
  return rows[0]?.cantidad || 0;
};

const countGraduadosAcumuladosByGroup = async ({ periodo, programa, facultad, nivel, conCancelados, groupField, groupAlias }) => {
  if (!periodo) {
    return [];
  }
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  let sql = `SELECT ${groupField} as ${groupAlias}, COUNT(*) as graduados
    FROM matriculas m1
    INNER JOIN (
      SELECT documento, MAX(NombrePeriodo) as ultimoPeriodo
      FROM matriculas
      WHERE EstadoEstudiante = ? AND periodo_egreso <= ?`;
  const subParams = ['GRADUADO', periodo];
  if (programa) {
    sql += ' AND PROGRAMA = ?';
    subParams.push(programa);
  }
  if (facultad) {
    sql += ' AND FACULTAD = ?';
    subParams.push(facultad);
  }
  if (nivel) {
    sql += ' AND NIVEL = ?';
    subParams.push(nivel);
  }
  sql += ` GROUP BY documento
    ) m2 ON m1.documento = m2.documento AND m1.NombrePeriodo = m2.ultimoPeriodo
    WHERE m1.EstadoEstudiante = ? AND m1.periodo_egreso <= ?`;
  const params = [...subParams, 'GRADUADO', periodo];
  if (!incluirCancelados) {
    sql += ' AND m1.EstadoMatricula = ?';
    params.push('APROBADA');
  }
  if (programa) {
    sql += ' AND m1.PROGRAMA = ?';
    params.push(programa);
  }
  if (facultad) {
    sql += ' AND m1.FACULTAD = ?';
    params.push(facultad);
  }
  if (nivel) {
    sql += ' AND m1.NIVEL = ?';
    params.push(nivel);
  }
  sql += ` GROUP BY ${groupAlias}`;
  const [rows] = await pool.promise().query(sql, params);
  return rows;
};

const getMatriculadosByGroup = async ({ periodo, programa, facultad, nivel, conCancelados, groupField, groupAlias }) => {
  const { where, params } = buildMatriculadosWhere({ periodo, programa, facultad, nivel, conCancelados });
    const selectGroup = groupField.replace(/^m1\./, '');
    const [rows] = await pool.promise().query(
    `SELECT ${selectGroup} as ${groupAlias}, COUNT(*) as cantidad FROM matriculas${where} GROUP BY ${groupAlias}`,
    params
  );
  return rows;
};

const getMatriculadosCount = async ({ periodo, programa, facultad, nivel, conCancelados }) => {
  const { where, params } = buildMatriculadosWhere({ periodo, programa, facultad, nivel, conCancelados });
  const [rows] = await pool.promise().query(`SELECT COUNT(*) as cantidad FROM matriculas${where}`, params);
  return rows[0]?.cantidad || 0;
};

const getMatriculadosNoGraduadosT2ByGroup = async ({ periodo, programa, facultad, nivel, conCancelados, groupField, groupAlias }) => {
  if (!periodo) {
    return [];
  }
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  const periodoConsulta = getPeriodoAnterior2(periodo);
  const selectGroup = groupField.replace(/^m1\./, '');
  let sql = `SELECT ${selectGroup} as ${groupAlias}, COUNT(*) as cantidad FROM matriculas`;
  const params = [];
  const conditions = [];
  if (!incluirCancelados) {
    conditions.push('EstadoMatricula = ?');
    params.push('APROBADA');
  }
  conditions.push("(EstadoEstudiante != 'GRADUADO' OR periodo_egreso > ? OR EstadoEstudiante IS NULL)");
  params.push(periodo);
  if (periodoConsulta) {
    conditions.push('NombrePeriodo = ?');
    params.push(periodoConsulta);
  }
  if (programa) {
    conditions.push('programa = ?');
    params.push(programa);
  }
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (nivel) {
    conditions.push('nivel = ?');
    params.push(nivel);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ` GROUP BY ${groupAlias}`;
  const [rows] = await pool.promise().query(sql, params);
  return rows;
};

const getMatriculadosNoGraduadosT2Count = async ({ periodo, programa, facultad, nivel, conCancelados }) => {
  if (!periodo) {
    return 0;
  }
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  const periodoConsulta = getPeriodoAnterior2(periodo);
  let sql = 'SELECT COUNT(*) as cantidad FROM matriculas';
  const params = [];
  const conditions = [];
  if (!incluirCancelados) {
    conditions.push('EstadoMatricula = ?');
    params.push('APROBADA');
  }
  conditions.push("(EstadoEstudiante != 'GRADUADO' OR periodo_egreso > ? OR EstadoEstudiante IS NULL)");
  params.push(periodo);
  if (periodoConsulta) {
    conditions.push('NombrePeriodo = ?');
    params.push(periodoConsulta);
  }
  if (programa) {
    conditions.push('programa = ?');
    params.push(programa);
  }
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (nivel) {
    conditions.push('nivel = ?');
    params.push(nivel);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  const [rows] = await pool.promise().query(sql, params);
  return rows[0]?.cantidad || 0;
};

const getMaxCohorte = async () => {
  const [rows] = await pool.promise().query('SELECT MAX(PERINGRESO) as maxCohorte FROM matriculas');
  return rows[0]?.maxCohorte || null;
};

const buildPrimiparosCohorteBaseSql = ({ cohorte, programa, facultad, nivel, conCancelados, sinCohorte }) => {
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  let sql = 'FROM matriculas m1 WHERE m1.peringreso = m1.nombreperiodo';

  if (!sinCohorte && cohorte) {
    sql += ` AND m1.PERINGRESO = '${cohorte.replace(/'/g, "''")}'`;
  }
  if (programa) {
    sql += ` AND m1.PROGRAMA = '${programa.replace(/'/g, "''")}'`;
  }
  if (facultad) {
    sql += ` AND m1.FACULTAD = '${facultad.replace(/'/g, "''")}'`;
  }
  if (nivel) {
    sql += ` AND m1.NIVEL = '${nivel.replace(/'/g, "''")}'`;
  }
  if (!incluirCancelados) {
    sql += ` AND m1.EstadoMatricula = 'APROBADA'`;
  }

  return sql;
};

const buildDesercionCohorteBaseSql = ({ cohorte, programa, facultad, nivel, semestre, conCancelados, sinCohorte }) => {
  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  const condicionEstadoMatricula = incluirCancelados ? '' : `m1.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub1 = incluirCancelados ? '' : `m2.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub2 = incluirCancelados ? '' : `m3.estadoMatricula = 'APROBADA' AND`;
  const condicionPrograma = programa ? ` m1.programa = '${programa.replace(/'/g, "''")}' AND` : '';
  const condicionProgramaSub1 = programa ? ` m2.programa = '${programa.replace(/'/g, "''")}' AND` : '';
  const condicionProgramaSub2 = programa ? ` m3.programa = '${programa.replace(/'/g, "''")}' AND` : '';

  let semestreFiltroSQL = '(SELECT MAX(NombrePeriodo) FROM matriculas)';
  if (semestre) {
    semestreFiltroSQL = `'${semestre.replace(/'/g, "''")}'`;
  }

  let sql = `FROM matriculas m1 JOIN periodoSiguiente p1 ON m1.NombrePeriodo = p1.periodoActual JOIN periodoSiguiente p2 ON p1.periodoSiguiente = p2.periodoActual 
  WHERE ${condicionEstadoMatricula} ${condicionPrograma} p2.periodoSiguiente <= ${semestreFiltroSQL} AND (m1.estadoEstudiante != "GRADUADO" OR m1.periodo_egreso > p2.periodoSiguiente)`;

  if (!sinCohorte && cohorte) {
    sql += ` AND m1.peringreso = '${cohorte.replace(/'/g, "''")}'`;
  }

  sql += ` AND p1.periodoSiguiente not in ( 
    SELECT m2.NombrePeriodo 
    FROM matriculas m2 
    WHERE ${condicionEstadoMatriculaSub1} ${condicionProgramaSub1} m1.documento= m2.documento AND p1.periodoSiguiente = m2.NombrePeriodo ) AND p2.periodoSiguiente not in ( 
    SELECT m3.NombrePeriodo 
    FROM matriculas m3 
    WHERE ${condicionEstadoMatriculaSub2} ${condicionProgramaSub2} m1.documento = m3.documento AND p2.periodoSiguiente = m3.NombrePeriodo )`;

  if (facultad) {
    sql += ` AND m1.facultad = '${facultad.replace(/'/g, "''")}'`;
  }
  if (nivel) {
    sql += ` AND m1.nivel = '${nivel.replace(/'/g, "''")}'`;
  }

  return sql;
};

exports.obtenerDesercion = (req, res) => {
  let { periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  const sinPeriodoFlag = sinPeriodo === 'true' || sinPeriodo === true;
  let periodoFiltro;
  let operadorPeriodo = '='; // Por defecto, igual al período
  let periodoCondicion = '';
  
  if (!sinPeriodoFlag) {
    if (periodo) {
      if (!/^\d{4}-[12]$/.test(periodo)) {
        return res.status(400).json({ error: 'Periodo inválido' });
      }
      periodoFiltro = `'${periodo}'`;
      
      // Si hastaPeriodo es true, usar <= para obtener todos los desertores hasta ese período
      if (hastaPeriodo === 'true' || hastaPeriodo === true) {
        operadorPeriodo = '<=';
      }
    } else {
      periodoFiltro = '(SELECT MAX(NombrePeriodo) FROM matriculas)';
    }
    periodoCondicion = ` p2.periodoSiguiente ${operadorPeriodo} ${periodoFiltro} AND`;
  }

  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  const condicionEstadoMatricula = incluirCancelados ? '' : `m1.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub1 = incluirCancelados ? '' : `m2.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub2 = incluirCancelados ? '' : `m3.estadoMatricula = 'APROBADA' AND`;
  const condicionPrograma = programa ? ` m1.programa = '${programa.replace(/'/g, "''")}' AND` : '';
  const condicionProgramaSub1 = programa ? ` m2.programa = '${programa.replace(/'/g, "''")}' AND` : '';
  const condicionProgramaSub2 = programa ? ` m3.programa = '${programa.replace(/'/g, "''")}' AND` : '';

  let sql = `SELECT p2.periodoSiguiente, m1.facultad, m1.programa, m1.estudiante, m1.codigo, m1.estadomatricula, m1.nivel, m1.peringreso, m1.estadoEstudiante, m1.tipodocumento, m1.documento, m1.telefonoppal, m1.celular, m1.correounac, m1.correootro, m1.muniprocedencia, m1.dptoprocedencia, m1.paisprocedencia 
  FROM matriculas m1 JOIN periodoSiguiente p1 ON m1.NombrePeriodo = p1.periodoActual JOIN periodoSiguiente p2 ON p1.periodoSiguiente = p2.periodoActual 
  WHERE ${condicionEstadoMatricula} ${condicionPrograma} ${periodoCondicion} (m1.estadoEstudiante != "GRADUADO" OR m1.periodo_egreso > p2.periodoSiguiente) AND p1.periodoSiguiente not in ( 
    SELECT m2.NombrePeriodo 
    FROM matriculas m2 
    WHERE ${condicionEstadoMatriculaSub1} ${condicionProgramaSub1} m1.documento = m2.documento AND p1.periodoSiguiente = m2.NombrePeriodo ) AND p2.periodoSiguiente not in ( 
    SELECT m3.NombrePeriodo 
    FROM matriculas m3 
    WHERE ${condicionEstadoMatriculaSub2} ${condicionProgramaSub2} m1.documento = m3.documento AND p2.periodoSiguiente = m3.NombrePeriodo )`;
  if (facultad) {
    sql += ` AND m1.facultad = '${facultad.replace(/'/g, "''")}'`;
  }
  if (nivel) {
    sql += ` AND m1.nivel = '${nivel.replace(/'/g, "''")}'`;
  }
  sql += ' ORDER BY m1.estudiante';
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Error SQL:', error);
      return res.status(500).json({ error: 'Error al obtener registros de deserción' });
    }
    res.json(results);
  });
};

const buildDesercionBaseSql = ({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo }) => {
  const sinPeriodoFlag = sinPeriodo === 'true' || sinPeriodo === true;
  let periodoFiltro;
  let operadorPeriodo = '=';
  let periodoCondicion = '';
  if (!sinPeriodoFlag) {
    if (periodo) {
      if (!/^\d{4}-[12]$/.test(periodo)) {
        throw new Error('Periodo inválido');
      }
      periodoFiltro = `'${periodo.replace(/'/g, "''")}'`;
      if (hastaPeriodo === 'true' || hastaPeriodo === true) {
        operadorPeriodo = '<=';
      }
    } else {
      periodoFiltro = '(SELECT MAX(NombrePeriodo) FROM matriculas)';
    }
    periodoCondicion = ` p2.periodoSiguiente ${operadorPeriodo} ${periodoFiltro} AND`;
  } else {
    // Cuando sinPeriodo=true, limitar hasta el último período disponible
    periodoCondicion = ` p2.periodoSiguiente <= (SELECT MAX(NombrePeriodo) FROM matriculas) AND`;
  }

  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  const condicionEstadoMatricula = incluirCancelados ? '' : `m1.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub1 = incluirCancelados ? '' : `m2.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub2 = incluirCancelados ? '' : `m3.estadoMatricula = 'APROBADA' AND`;
  const programaSanitizado = programa ? programa.replace(/'/g, "''") : null;
  const condicionPrograma = programa ? ` m1.programa = '${programaSanitizado}' AND` : '';
  const condicionProgramaSub1 = programa ? ` m2.programa = '${programaSanitizado}' AND` : '';
  const condicionProgramaSub2 = programa ? ` m3.programa = '${programaSanitizado}' AND` : '';

  let sql = ` FROM matriculas m1 JOIN periodoSiguiente p1 ON m1.NombrePeriodo = p1.periodoActual JOIN periodoSiguiente p2 ON p1.periodoSiguiente = p2.periodoActual 
  WHERE ${condicionEstadoMatricula} ${condicionPrograma} ${periodoCondicion} (m1.estadoEstudiante != "GRADUADO" OR m1.periodo_egreso > p2.periodoSiguiente) AND p1.periodoSiguiente not in ( 
    SELECT m2.NombrePeriodo 
    FROM matriculas m2 
    WHERE ${condicionEstadoMatriculaSub1} ${condicionProgramaSub1} m1.documento = m2.documento AND p1.periodoSiguiente = m2.NombrePeriodo ) AND p2.periodoSiguiente not in ( 
    SELECT m3.NombrePeriodo 
    FROM matriculas m3 
    WHERE ${condicionEstadoMatriculaSub2} ${condicionProgramaSub2} m1.documento = m3.documento AND p2.periodoSiguiente = m3.NombrePeriodo )`;

  if (facultad) {
    sql += ` AND m1.facultad = '${facultad.replace(/'/g, "''")}'`;
  }
  if (nivel) {
    sql += ` AND m1.nivel = '${nivel.replace(/'/g, "''")}'`;
  }

  return sql;
};

exports.obtenerEstadisticaDesercionPorPeriodo = (req, res) => {
  const { periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  try {
    const baseSql = buildDesercionBaseSql({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo });
    const sql = `SELECT p2.periodoSiguiente as periodo, COUNT(*) as cantidad ${baseSql} GROUP BY p2.periodoSiguiente ORDER BY p2.periodoSiguiente`;
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Error SQL:', error);
        return res.status(500).json({ error: 'Error al obtener estadística de deserción por período' });
      }
      res.json(results);
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.obtenerEstadisticaDesercionPorFacultad = (req, res) => {
  const { periodo, programa, nivel, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  try {
    const baseSql = buildDesercionBaseSql({ periodo, programa, nivel, conCancelados, hastaPeriodo, sinPeriodo });
    const sql = `SELECT m1.facultad as facultad, COUNT(*) as cantidad ${baseSql} GROUP BY m1.facultad ORDER BY cantidad DESC, facultad`;
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Error SQL:', error);
        return res.status(500).json({ error: 'Error al obtener estadística de deserción por facultad' });
      }
      res.json(results);
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.obtenerEstadisticaDesercionPorPrograma = (req, res) => {
  const { periodo, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  try {
    const baseSql = buildDesercionBaseSql({ periodo, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo });
    const sql = `SELECT m1.programa as programa, COUNT(*) as cantidad ${baseSql} GROUP BY m1.programa ORDER BY cantidad DESC, programa`;
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Error SQL:', error);
        return res.status(500).json({ error: 'Error al obtener estadística de deserción por programa' });
      }
      res.json(results);
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.obtenerEstadisticaDesercionPorNivel = (req, res) => {
  const { periodo, facultad, programa, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  try {
    const baseSql = buildDesercionBaseSql({ periodo, facultad, programa, conCancelados, hastaPeriodo, sinPeriodo });
    const sql = `SELECT m1.nivel as nivel, COUNT(*) as cantidad ${baseSql} GROUP BY m1.nivel ORDER BY CAST(m1.nivel AS UNSIGNED) ASC`;
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Error SQL:', error);
        return res.status(500).json({ error: 'Error al obtener estadística de deserción por nivel' });
      }
      res.json(results);
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Endpoint para obtener programas únicos
exports.obtenerProgramas = (req, res) => {
  pool.query('SELECT DISTINCT programa FROM matriculas ORDER BY programa', (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error al obtener programas' });
    }
    res.json(results.map(r => r.programa));
  });
};

// Endpoint para obtener desertores por cohorte
exports.obtenerDesertoresCohorte = (req, res) => {
  let { periodo, cohorte, semestre, hasta, programa, facultad, nivel, conCancelados } = req.query;
  
  // cohorte puede venir como 'periodo' o 'cohorte', semestre puede venir como 'hasta' o 'semestre'
  const cohorteFiltro = cohorte || periodo;
  const semestreFiltro = semestre || hasta;
  
  // Validar cohorte
  let cohorteFiltroSQL = null;
  if (cohorteFiltro) {
    if (!/^\d{4}-[12]$/.test(cohorteFiltro)) {
      return res.status(400).json({ error: 'Cohorte inválida' });
    }
    cohorteFiltroSQL = `'${cohorteFiltro}'`;
  }
  
  // Validar semestre
  let semestreFiltroSQL = null;
  if (semestreFiltro) {
    if (!/^\d{4}-[12]$/.test(semestreFiltro)) {
      return res.status(400).json({ error: 'Semestre inválido' });
    }
    semestreFiltroSQL = `'${semestreFiltro}'`;
  } else {
    // Si no se especifica semestre, usar el más reciente
    semestreFiltroSQL = '(SELECT MAX(NombrePeriodo) FROM matriculas)';
  }

  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  const condicionEstadoMatricula = incluirCancelados ? '' : `m1.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub1 = incluirCancelados ? '' : `m2.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub2 = incluirCancelados ? '' : `m3.estadoMatricula = 'APROBADA' AND`;
  const condicionPrograma = programa ? ` m1.programa = '${programa.replace(/'/g, "''")}' AND` : '';
  const condicionProgramaSub1 = programa ? ` m2.programa = '${programa.replace(/'/g, "''")}' AND` : '';
  const condicionProgramaSub2 = programa ? ` m3.programa = '${programa.replace(/'/g, "''")}' AND` : '';
  
  let sql = `SELECT p2.periodoSiguiente as periodoSemestre, m1.peringreso as periodoCohorte, m1.NombrePeriodo as periodoMatricula, m1.facultad, m1.programa, m1.estudiante, m1.codigo, m1.estadomatricula, m1.nivel, m1.estadoEstudiante, m1.tipodocumento, m1.documento, m1.telefonoppal, m1.celular, m1.correounac, m1.correootro, m1.muniprocedencia, m1.dptoprocedencia, m1.paisprocedencia 
  FROM matriculas m1 JOIN periodoSiguiente p1 ON m1.NombrePeriodo = p1.periodoActual JOIN periodoSiguiente p2 ON p1.periodoSiguiente = p2.periodoActual 
  WHERE ${condicionEstadoMatricula} ${condicionPrograma} p2.periodoSiguiente <= ${semestreFiltroSQL} AND (m1.estadoEstudiante != "GRADUADO" OR m1.periodo_egreso > p2.periodoSiguiente)`;
  
  // Filtrar por cohorte si se especifica
  if (cohorteFiltroSQL) {
    sql += ` AND m1.peringreso = ${cohorteFiltroSQL}`;
  }
  
  sql += ` AND p1.periodoSiguiente not in ( 
    SELECT m2.NombrePeriodo 
    FROM matriculas m2 
    WHERE ${condicionEstadoMatriculaSub1} ${condicionProgramaSub1} m1.documento= m2.documento AND p1.periodoSiguiente = m2.NombrePeriodo ) AND p2.periodoSiguiente not in ( 
    SELECT m3.NombrePeriodo 
    FROM matriculas m3 
    WHERE ${condicionEstadoMatriculaSub2} ${condicionProgramaSub2} m1.documento = m3.documento AND p2.periodoSiguiente = m3.NombrePeriodo )`;

  if (facultad) {
    sql += ` AND m1.facultad = '${facultad.replace(/'/g, "''")}'`;
  }
  if (nivel) {
    sql += ` AND m1.nivel = '${nivel.replace(/'/g, "''")}'`;
  }
  sql += ' ORDER BY m1.estudiante';
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Error SQL:', error);
      return res.status(500).json({ error: 'Error al obtener registros de deserción' });
    }
    res.json(results);
  });
};

// Endpoint para obtener ausencia intersemestral (sin p2 y m3)
const buildAusenciaBaseSql = ({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo }) => {
  const sinPeriodoFlag = sinPeriodo === 'true' || sinPeriodo === true;
  let periodoFiltro;
  let operadorPeriodo = '=';
  let periodoCondicion = '';
  
  if (!sinPeriodoFlag) {
    if (periodo) {
      if (!/^\d{4}-[12]$/.test(periodo)) {
        throw new Error('Periodo inválido');
      }
      periodoFiltro = `'${periodo.replace(/'/g, "''")}'`;
      
      if (hastaPeriodo === 'true' || hastaPeriodo === true) {
        operadorPeriodo = '<=';
      }
    } else {
      periodoFiltro = '(SELECT MAX(NombrePeriodo) FROM matriculas)';
    }
    periodoCondicion = ` p1.periodoSiguiente ${operadorPeriodo} ${periodoFiltro} AND`;
  } else {
    // Cuando sinPeriodo=true, limitar hasta el último período disponible
    periodoCondicion = ` p1.periodoSiguiente <= (SELECT MAX(NombrePeriodo) FROM matriculas) AND`;
  }

  const incluirCancelados = conCancelados === 'true' || conCancelados === true;
  const condicionEstadoMatricula = incluirCancelados ? '' : `m1.estadoMatricula = 'APROBADA' AND`;
  const condicionEstadoMatriculaSub1 = incluirCancelados ? '' : `m2.estadoMatricula = 'APROBADA' AND`;
  const condicionPrograma = programa ? ` m1.programa = '${programa.replace(/'/g, "''")}' AND` : '';
  const condicionProgramaSub1 = programa ? ` m2.programa = '${programa.replace(/'/g, "''")}' AND` : '';

  let sql = ` FROM matriculas m1 JOIN periodoSiguiente p1 ON m1.NombrePeriodo = p1.periodoActual 
  WHERE ${condicionEstadoMatricula} ${condicionPrograma} ${periodoCondicion} (m1.estadoEstudiante != "GRADUADO" OR m1.periodo_egreso > p1.periodoSiguiente) AND p1.periodoSiguiente not in ( 
    SELECT m2.NombrePeriodo 
    FROM matriculas m2 
    WHERE ${condicionEstadoMatriculaSub1} ${condicionProgramaSub1} m1.documento = m2.documento AND p1.periodoSiguiente = m2.NombrePeriodo )`;

  if (facultad) {
    sql += ` AND m1.facultad = '${facultad.replace(/'/g, "''")}'`;
  }
  if (nivel) {
    sql += ` AND m1.nivel = '${nivel.replace(/'/g, "''")}'`;
  }
  return sql;
};

exports.obtenerAusenciaIntersemestral = (req, res) => {
  console.log('[Ausencia Intersemestral] Endpoint llamado');
  console.log('[Ausencia Intersemestral] Query params:', req.query);
  let { periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  
  let sql;
  try {
    const baseSql = buildAusenciaBaseSql({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo });
    sql = `SELECT p1.periodoSiguiente, m1.facultad, m1.programa, m1.estudiante, m1.codigo, m1.estadomatricula, m1.nivel, m1.peringreso, m1.estadoEstudiante, m1.tipodocumento, m1.documento, m1.telefonoppal, m1.celular, m1.correounac, m1.correootro, m1.muniprocedencia, m1.dptoprocedencia, m1.paisprocedencia ${baseSql} ORDER BY m1.estudiante`;
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  
  console.log(`[Ausencia Intersemestral] SQL ejecutado: ${sql}`);
  console.log(`[Ausencia Intersemestral] Parámetros: periodo=${periodo}, programa=${programa}, facultad=${facultad}, conCancelados=${conCancelados}`);
  pool.query(sql, (error, results) => {
    if (error) {
      console.error('[Ausencia Intersemestral] Error SQL:', error);
      return res.status(500).json({ error: 'Error al obtener registros de ausencia intersemestral' });
    }
    console.log(`[Ausencia Intersemestral] Resultado: ${results.length} registros`);
    res.json(results);
  });
};

exports.obtenerEstadisticaAusenciaPorPeriodo = (req, res) => {
  const { periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  try {
    const baseSql = buildAusenciaBaseSql({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo });
    const sql = `SELECT p1.periodoSiguiente as periodo, COUNT(*) as cantidad ${baseSql} GROUP BY p1.periodoSiguiente ORDER BY p1.periodoSiguiente`;
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Error SQL:', error);
        return res.status(500).json({ error: 'Error al obtener estadística de ausencia intersemestral por período' });
      }
      res.json(results);
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.obtenerEstadisticaAusenciaPorFacultad = (req, res) => {
  const { periodo, programa, nivel, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  try {
    const baseSql = buildAusenciaBaseSql({ periodo, programa, nivel, conCancelados, hastaPeriodo, sinPeriodo });
    const sql = `SELECT m1.facultad as facultad, COUNT(*) as cantidad ${baseSql} GROUP BY m1.facultad ORDER BY cantidad DESC, facultad`;
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Error SQL:', error);
        return res.status(500).json({ error: 'Error al obtener estadística de ausencia intersemestral por facultad' });
      }
      res.json(results);
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.obtenerEstadisticaAusenciaPorPrograma = (req, res) => {
  const { periodo, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  try {
    const baseSql = buildAusenciaBaseSql({ periodo, facultad, nivel, conCancelados, hastaPeriodo, sinPeriodo });
    const sql = `SELECT m1.programa as programa, COUNT(*) as cantidad ${baseSql} GROUP BY m1.programa ORDER BY cantidad DESC, programa`;
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Error SQL:', error);
        return res.status(500).json({ error: 'Error al obtener estadística de ausencia intersemestral por programa' });
      }
      res.json(results);
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.obtenerEstadisticaAusenciaPorNivel = (req, res) => {
  const { periodo, facultad, programa, conCancelados, hastaPeriodo, sinPeriodo } = req.query;
  try {
    const baseSql = buildAusenciaBaseSql({ periodo, facultad, programa, conCancelados, hastaPeriodo, sinPeriodo });
    const sql = `SELECT m1.nivel as nivel, COUNT(*) as cantidad ${baseSql} GROUP BY m1.nivel ORDER BY CAST(m1.nivel AS UNSIGNED) ASC`;
    pool.query(sql, (error, results) => {
      if (error) {
        console.error('Error SQL:', error);
        return res.status(500).json({ error: 'Error al obtener estadística de ausencia intersemestral por nivel' });
      }
      res.json(results);
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.obtenerTasaDesercionPorPeriodo = async (req, res) => {
  const { programa, facultad, nivel, conCancelados } = req.query;
  try {
    const baseSql = buildDesercionBaseSql({ programa, facultad, nivel, conCancelados, sinPeriodo: true });
    const [desertoresRows] = await pool.promise().query(
      `SELECT p2.periodoSiguiente as periodo, COUNT(*) as desertores ${baseSql} GROUP BY p2.periodoSiguiente ORDER BY p2.periodoSiguiente`
    );

    const { where, params } = buildMatriculadosWhere({ programa, facultad, nivel, conCancelados });
    const [matriculadosRows] = await pool.promise().query(
      `SELECT NombrePeriodo, COUNT(*) as cantidad FROM matriculas${where} GROUP BY NombrePeriodo`,
      params
    );
    const matriculadosMap = new Map(matriculadosRows.map((row) => [row.NombrePeriodo, row.cantidad]));

    const results = desertoresRows.map((row) => {
      const periodoConsulta = getPeriodoAnterior2(row.periodo);
      const matriculados = matriculadosMap.get(periodoConsulta) || 0;
      const tasa = matriculados > 0 ? Number(((row.desertores / matriculados) * 100).toFixed(2)) : 0;
      return {
        periodo: row.periodo,
        desertores: row.desertores,
        matriculados,
        tasa
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción por período:', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción por período' });
  }
};

const buildTasaDesercionPorGrupo = async ({ periodo, programa, facultad, nivel, conCancelados, groupField, groupAlias }) => {
  const periodoBase = periodo || await getMaxPeriodo();
  if (!periodoBase) {
    return [];
  }
  const baseSql = buildDesercionBaseSql({
    periodo: periodoBase,
    programa,
    facultad,
    nivel,
    conCancelados
  });
  const [desertoresRows] = await pool.promise().query(
    `SELECT ${groupField} as ${groupAlias}, COUNT(*) as desertores ${baseSql} GROUP BY ${groupField} ORDER BY desertores DESC, ${groupAlias}`
  );

  const periodoConsulta = getPeriodoAnterior2(periodoBase);
  const { where, params } = buildMatriculadosWhere({
    periodo: periodoConsulta,
    programa,
    facultad,
    nivel,
    conCancelados
  });
  const [matriculadosRows] = await pool.promise().query(
    `SELECT ${groupAlias} as ${groupAlias}, COUNT(*) as cantidad FROM matriculas${where} GROUP BY ${groupAlias}`,
    params
  );
  const matriculadosMap = new Map(matriculadosRows.map((row) => [row[groupAlias], row.cantidad]));

  return desertoresRows.map((row) => {
    const matriculados = matriculadosMap.get(row[groupAlias]) || 0;
    const tasa = matriculados > 0 ? Number(((row.desertores / matriculados) * 100).toFixed(2)) : 0;
    return {
      [groupAlias]: row[groupAlias],
      desertores: row.desertores,
      matriculados,
      tasa
    };
  });
};

exports.obtenerTasaDesercionPorFacultad = async (req, res) => {
  const { periodo, programa, nivel, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercionPorGrupo({
      periodo,
      programa,
      nivel,
      conCancelados,
      groupField: 'm1.facultad',
      groupAlias: 'facultad'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción por facultad:', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción por facultad' });
  }
};

exports.obtenerTasaDesercionPorPrograma = async (req, res) => {
  const { periodo, facultad, nivel, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercionPorGrupo({
      periodo,
      facultad,
      nivel,
      conCancelados,
      groupField: 'm1.programa',
      groupAlias: 'programa'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción por programa:', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción por programa' });
  }
};

exports.obtenerTasaDesercionPorNivel = async (req, res) => {
  const { periodo, facultad, programa, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercionPorGrupo({
      periodo,
      facultad,
      programa,
      conCancelados,
      groupField: 'm1.nivel',
      groupAlias: 'nivel'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción por nivel:', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción por nivel' });
  }
};

exports.obtenerTasaDesercionCohortePorPeriodo = async (req, res) => {
  const { programa, facultad, nivel, semestre, conCancelados } = req.query;
  try {
    const primiparosBaseSql = buildPrimiparosCohorteBaseSql({
      programa,
      facultad,
      nivel,
      conCancelados,
      sinCohorte: true
    });
    const [primiparosRows] = await pool.promise().query(
      `SELECT m1.peringreso as periodo, COUNT(*) as primiparos ${primiparosBaseSql} GROUP BY m1.peringreso ORDER BY m1.peringreso`
    );
    const desertoresBaseSql = buildDesercionCohorteBaseSql({
      programa,
      facultad,
      nivel,
      semestre,
      conCancelados,
      sinCohorte: true
    });
    const [desertoresRows] = await pool.promise().query(
      `SELECT m1.peringreso as periodo, COUNT(*) as desertores ${desertoresBaseSql} GROUP BY m1.peringreso ORDER BY m1.peringreso`
    );
    const desertoresMap = new Map(desertoresRows.map((row) => [row.periodo, row.desertores]));

    const results = primiparosRows.map((row) => {
      const desertores = desertoresMap.get(row.periodo) || 0;
      const tasa = row.primiparos > 0 ? Number(((desertores / row.primiparos) * 100).toFixed(2)) : 0;
      return {
        periodo: row.periodo,
        desertores,
        primiparos: row.primiparos,
        tasa
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción por cohorte (periodo):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción por cohorte (periodo)' });
  }
};

const buildTasaDesercionCohortePorGrupo = async ({ cohorte, programa, facultad, nivel, semestre, conCancelados, groupField, groupAlias }) => {
  const cohorteBase = cohorte || await getMaxCohorte();
  if (!cohorteBase) {
    return [];
  }

  const desertoresBaseSql = buildDesercionCohorteBaseSql({
    cohorte: cohorteBase,
    programa,
    facultad,
    nivel,
    semestre,
    conCancelados
  });
  const [desertoresRows] = await pool.promise().query(
    `SELECT ${groupField} as ${groupAlias}, COUNT(*) as desertores ${desertoresBaseSql} GROUP BY ${groupField} ORDER BY desertores DESC, ${groupAlias}`
  );

  const primiparosBaseSql = buildPrimiparosCohorteBaseSql({
    cohorte: cohorteBase,
    programa,
    facultad,
    nivel,
    conCancelados
  });
  const [primiparosRows] = await pool.promise().query(
    `SELECT ${groupField} as ${groupAlias}, COUNT(*) as primiparos ${primiparosBaseSql} GROUP BY ${groupField}`
  );
  const primiparosMap = new Map(primiparosRows.map((row) => [row[groupAlias], row.primiparos]));
  const desertoresMap = new Map(desertoresRows.map((row) => [row[groupAlias], row.desertores]));
  const keys = new Set([...primiparosMap.keys(), ...desertoresMap.keys()]);

  return Array.from(keys).map((key) => {
    const primiparos = primiparosMap.get(key) || 0;
    const desertores = desertoresMap.get(key) || 0;
    const tasa = primiparos > 0 ? Number(((desertores / primiparos) * 100).toFixed(2)) : 0;
    return {
      [groupAlias]: key,
      desertores,
      primiparos,
      tasa
    };
  });
};

exports.obtenerTasaDesercionCohortePorFacultad = async (req, res) => {
  const { cohorte, programa, nivel, semestre, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercionCohortePorGrupo({
      cohorte,
      programa,
      nivel,
      semestre,
      conCancelados,
      groupField: 'm1.facultad',
      groupAlias: 'facultad'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción por cohorte (facultad):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción por cohorte (facultad)' });
  }
};

exports.obtenerTasaDesercionCohortePorPrograma = async (req, res) => {
  const { cohorte, facultad, nivel, semestre, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercionCohortePorGrupo({
      cohorte,
      facultad,
      nivel,
      semestre,
      conCancelados,
      groupField: 'm1.programa',
      groupAlias: 'programa'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción por cohorte (programa):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción por cohorte (programa)' });
  }
};

exports.obtenerTasaDesercionCohortePorNivel = async (req, res) => {
  const { cohorte, facultad, programa, semestre, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercionCohortePorGrupo({
      cohorte,
      facultad,
      programa,
      semestre,
      conCancelados,
      groupField: 'm1.nivel',
      groupAlias: 'nivel'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción por cohorte (nivel):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción por cohorte (nivel)' });
  }
};

exports.obtenerTasaDesercionPromedioPorPeriodo = async (req, res) => {
  const { programa, facultad, nivel, conCancelados } = req.query;
  try {
    const periodos = await getAllPeriodos();
    const results = [];
    for (const periodo of periodos) {
      const desertores = await countDesertores({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo: true });
      const primiparos = await countPrimiparosAcumulados({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((desertores / primiparos) * 100).toFixed(2)) : 0;
      results.push({ periodo, desertores, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción promedio acumulada (periodo):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción promedio acumulada (periodo)' });
  }
};

exports.obtenerTasaDesercionPromedioPorFacultad = async (req, res) => {
  const { periodo, programa, nivel, conCancelados } = req.query;
  try {
    const primiparosRows = await countPrimiparosAcumuladosByGroup({
      periodo,
      programa,
      nivel,
      conCancelados,
      groupField: 'm1.facultad',
      groupAlias: 'facultad',
      hastaPeriodo: true
    });
    const desertoresBaseSql = buildDesercionBaseSql({ periodo, programa, nivel, conCancelados, hastaPeriodo: true });
    const [desertoresRows] = await pool.promise().query(
      `SELECT m1.facultad as facultad, COUNT(*) as desertores ${desertoresBaseSql} GROUP BY m1.facultad`
    );
    const keys = new Set([
      ...primiparosRows.map((row) => row.facultad),
      ...desertoresRows.map((row) => row.facultad)
    ]);
    const results = [];
    for (const key of keys) {
      const desertores = await countDesertores({ periodo, programa, facultad: key, nivel, conCancelados, hastaPeriodo: true });
      const primiparos = await countPrimiparosAcumulados({ periodo, programa, facultad: key, nivel, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((desertores / primiparos) * 100).toFixed(2)) : 0;
      results.push({ facultad: key, desertores, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción promedio acumulada (facultad):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción promedio acumulada (facultad)' });
  }
};

exports.obtenerTasaDesercionPromedioPorPrograma = async (req, res) => {
  const { periodo, facultad, nivel, conCancelados } = req.query;
  try {
    const primiparosRows = await countPrimiparosAcumuladosByGroup({
      periodo,
      facultad,
      nivel,
      conCancelados,
      groupField: 'm1.programa',
      groupAlias: 'programa',
      hastaPeriodo: true
    });
    const desertoresBaseSql = buildDesercionBaseSql({ periodo, facultad, nivel, conCancelados, hastaPeriodo: true });
    const [desertoresRows] = await pool.promise().query(
      `SELECT m1.programa as programa, COUNT(*) as desertores ${desertoresBaseSql} GROUP BY m1.programa`
    );
    const keys = new Set([
      ...primiparosRows.map((row) => row.programa),
      ...desertoresRows.map((row) => row.programa)
    ]);
    const results = [];
    for (const key of keys) {
      const desertores = await countDesertores({ periodo, programa: key, facultad, nivel, conCancelados, hastaPeriodo: true });
      const primiparos = await countPrimiparosAcumulados({ periodo, programa: key, facultad, nivel, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((desertores / primiparos) * 100).toFixed(2)) : 0;
      results.push({ programa: key, desertores, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción promedio acumulada (programa):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción promedio acumulada (programa)' });
  }
};

exports.obtenerTasaDesercionPromedioPorNivel = async (req, res) => {
  const { periodo, facultad, programa, conCancelados } = req.query;
  try {
    const primiparosRows = await countPrimiparosAcumuladosByGroup({
      periodo,
      facultad,
      programa,
      conCancelados,
      groupField: 'm1.nivel',
      groupAlias: 'nivel',
      hastaPeriodo: true
    });
    const desertoresBaseSql = buildDesercionBaseSql({ periodo, facultad, programa, conCancelados, hastaPeriodo: true });
    const [desertoresRows] = await pool.promise().query(
      `SELECT m1.nivel as nivel, COUNT(*) as desertores ${desertoresBaseSql} GROUP BY m1.nivel`
    );
    const keys = new Set([
      ...primiparosRows.map((row) => row.nivel),
      ...desertoresRows.map((row) => row.nivel)
    ]);
    const results = [];
    for (const key of keys) {
      const desertores = await countDesertores({ periodo, facultad, programa, nivel: key, conCancelados, hastaPeriodo: true });
      const primiparos = await countPrimiparosAcumulados({ periodo, facultad, programa, nivel: key, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((desertores / primiparos) * 100).toFixed(2)) : 0;
      results.push({ nivel: key, desertores, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción promedio acumulada (nivel):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción promedio acumulada (nivel)' });
  }
};

exports.obtenerTasaGraduacionPorPeriodo = async (req, res) => {
  const { programa, facultad, nivel, conCancelados } = req.query;
  try {
    const periodos = await getAllPeriodos();
    const results = [];
    for (const periodo of periodos) {
      const graduados = await countGraduadosAcumulados({ periodo, programa, facultad, nivel, conCancelados });
      const primiparos = await countPrimiparosAcumulados({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((graduados / primiparos) * 100).toFixed(2)) : 0;
      results.push({ periodo, graduados, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de graduación acumulada (periodo):', error);
    res.status(500).json({ error: 'Error al obtener tasa de graduación acumulada (periodo)' });
  }
};

exports.obtenerTasaGraduacionPorFacultad = async (req, res) => {
  const { periodo, programa, nivel, conCancelados } = req.query;
  try {
    const graduadosRows = await countGraduadosAcumuladosByGroup({
      periodo,
      programa,
      nivel,
      conCancelados,
      groupField: 'm1.facultad',
      groupAlias: 'facultad'
    });
    const primiparosRows = await countPrimiparosAcumuladosByGroup({
      periodo,
      programa,
      nivel,
      conCancelados,
      groupField: 'm1.facultad',
      groupAlias: 'facultad',
      hastaPeriodo: true
    });
    const keys = new Set([
      ...primiparosRows.map((row) => row.facultad),
      ...graduadosRows.map((row) => row.facultad)
    ]);
    const results = [];
    for (const key of keys) {
      const graduados = await countGraduadosAcumulados({ periodo, programa, facultad: key, nivel, conCancelados });
      const primiparos = await countPrimiparosAcumulados({ periodo, programa, facultad: key, nivel, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((graduados / primiparos) * 100).toFixed(2)) : 0;
      results.push({ facultad: key, graduados, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de graduación acumulada (facultad):', error);
    res.status(500).json({ error: 'Error al obtener tasa de graduación acumulada (facultad)' });
  }
};

exports.obtenerTasaGraduacionPorPrograma = async (req, res) => {
  const { periodo, facultad, nivel, conCancelados } = req.query;
  try {
    const graduadosRows = await countGraduadosAcumuladosByGroup({
      periodo,
      facultad,
      nivel,
      conCancelados,
      groupField: 'm1.programa',
      groupAlias: 'programa'
    });
    const primiparosRows = await countPrimiparosAcumuladosByGroup({
      periodo,
      facultad,
      nivel,
      conCancelados,
      groupField: 'm1.programa',
      groupAlias: 'programa',
      hastaPeriodo: true
    });
    const keys = new Set([
      ...primiparosRows.map((row) => row.programa),
      ...graduadosRows.map((row) => row.programa)
    ]);
    const results = [];
    for (const key of keys) {
      const graduados = await countGraduadosAcumulados({ periodo, programa: key, facultad, nivel, conCancelados });
      const primiparos = await countPrimiparosAcumulados({ periodo, programa: key, facultad, nivel, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((graduados / primiparos) * 100).toFixed(2)) : 0;
      results.push({ programa: key, graduados, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de graduación acumulada (programa):', error);
    res.status(500).json({ error: 'Error al obtener tasa de graduación acumulada (programa)' });
  }
};

exports.obtenerTasaGraduacionPorNivel = async (req, res) => {
  const { periodo, facultad, programa, conCancelados } = req.query;
  try {
    const graduadosRows = await countGraduadosAcumuladosByGroup({
      periodo,
      facultad,
      programa,
      conCancelados,
      groupField: 'm1.nivel',
      groupAlias: 'nivel'
    });
    const primiparosRows = await countPrimiparosAcumuladosByGroup({
      periodo,
      facultad,
      programa,
      conCancelados,
      groupField: 'm1.nivel',
      groupAlias: 'nivel',
      hastaPeriodo: true
    });
    const keys = new Set([
      ...primiparosRows.map((row) => row.nivel),
      ...graduadosRows.map((row) => row.nivel)
    ]);
    const results = [];
    for (const key of keys) {
      const graduados = await countGraduadosAcumulados({ periodo, facultad, programa, nivel: key, conCancelados });
      const primiparos = await countPrimiparosAcumulados({ periodo, facultad, programa, nivel: key, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((graduados / primiparos) * 100).toFixed(2)) : 0;
      results.push({ nivel: key, graduados, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de graduación acumulada (nivel):', error);
    res.status(500).json({ error: 'Error al obtener tasa de graduación acumulada (nivel)' });
  }
};

exports.obtenerTasaAusenciaPorPeriodo = async (req, res) => {
  const { programa, facultad, nivel, conCancelados } = req.query;
  try {
    const baseSql = buildAusenciaBaseSql({ programa, facultad, nivel, conCancelados, sinPeriodo: true });
    const [ausenciasRows] = await pool.promise().query(
      `SELECT p1.periodoSiguiente as periodo, COUNT(*) as ausencias ${baseSql} GROUP BY p1.periodoSiguiente ORDER BY p1.periodoSiguiente`
    );
    const { where, params } = buildMatriculadosWhere({ programa, facultad, nivel, conCancelados });
    const [matriculadosRows] = await pool.promise().query(
      `SELECT NombrePeriodo, COUNT(*) as cantidad FROM matriculas${where} GROUP BY NombrePeriodo`,
      params
    );
    const matriculadosMap = new Map(matriculadosRows.map((row) => [row.NombrePeriodo, row.cantidad]));
    const results = ausenciasRows.map((row) => {
      const periodoConsulta = getPeriodoAnterior1(row.periodo);
      const matriculados = matriculadosMap.get(periodoConsulta) || 0;
      const tasa = matriculados > 0 ? Number(((row.ausencias / matriculados) * 100).toFixed(2)) : 0;
      return {
        periodo: row.periodo,
        ausencias: row.ausencias,
        matriculados,
        tasa
      };
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de ausencia intersemestral (periodo):', error);
    res.status(500).json({ error: 'Error al obtener tasa de ausencia intersemestral (periodo)' });
  }
};

const buildTasaAusenciaPorGrupo = async ({ periodo, programa, facultad, nivel, conCancelados, groupField, groupAlias }) => {
  const periodoBase = periodo || await getMaxPeriodo();
  if (!periodoBase) {
    return [];
  }
  const baseSql = buildAusenciaBaseSql({ periodo: periodoBase, programa, facultad, nivel, conCancelados });
  const [ausenciasRows] = await pool.promise().query(
    `SELECT ${groupField} as ${groupAlias}, COUNT(*) as ausencias ${baseSql} GROUP BY ${groupField} ORDER BY ausencias DESC, ${groupAlias}`
  );
  const periodoConsulta = getPeriodoAnterior1(periodoBase);
  const matriculadosRows = await getMatriculadosByGroup({
    periodo: periodoConsulta,
    programa,
    facultad,
    nivel,
    conCancelados,
    groupField,
    groupAlias
  });
  const matriculadosMap = new Map(matriculadosRows.map((row) => [row[groupAlias], row.cantidad]));
  return ausenciasRows.map((row) => {
    const matriculados = matriculadosMap.get(row[groupAlias]) || 0;
    const tasa = matriculados > 0 ? Number(((row.ausencias / matriculados) * 100).toFixed(2)) : 0;
    return {
      [groupAlias]: row[groupAlias],
      ausencias: row.ausencias,
      matriculados,
      tasa
    };
  });
};

exports.obtenerTasaAusenciaPorFacultad = async (req, res) => {
  const { periodo, programa, nivel, conCancelados } = req.query;
  try {
    const results = await buildTasaAusenciaPorGrupo({
      periodo,
      programa,
      nivel,
      conCancelados,
      groupField: 'm1.facultad',
      groupAlias: 'facultad'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de ausencia intersemestral (facultad):', error);
    res.status(500).json({ error: 'Error al obtener tasa de ausencia intersemestral (facultad)' });
  }
};

exports.obtenerTasaAusenciaPorPrograma = async (req, res) => {
  const { periodo, facultad, nivel, conCancelados } = req.query;
  try {
    const results = await buildTasaAusenciaPorGrupo({
      periodo,
      facultad,
      nivel,
      conCancelados,
      groupField: 'm1.programa',
      groupAlias: 'programa'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de ausencia intersemestral (programa):', error);
    res.status(500).json({ error: 'Error al obtener tasa de ausencia intersemestral (programa)' });
  }
};

exports.obtenerTasaAusenciaPorNivel = async (req, res) => {
  const { periodo, facultad, programa, conCancelados } = req.query;
  try {
    const results = await buildTasaAusenciaPorGrupo({
      periodo,
      facultad,
      programa,
      conCancelados,
      groupField: 'm1.nivel',
      groupAlias: 'nivel'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de ausencia intersemestral (nivel):', error);
    res.status(500).json({ error: 'Error al obtener tasa de ausencia intersemestral (nivel)' });
  }
};

exports.obtenerTasaSupervivenciaPorPeriodo = async (req, res) => {
  const { programa, facultad, nivel, conCancelados } = req.query;
  try {
    const periodos = await getAllPeriodos();
    const results = [];
    for (const periodo of periodos) {
      const matriculados = await getMatriculadosCount({ periodo, programa, facultad, nivel, conCancelados });
      const primiparos = await countPrimiparosAcumulados({ periodo, programa, facultad, nivel, conCancelados, hastaPeriodo: true });
      const tasa = primiparos > 0 ? Number(((matriculados / primiparos) * 100).toFixed(2)) : 0;
      results.push({ periodo, matriculados, primiparos, tasa });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de supervivencia (periodo):', error);
    res.status(500).json({ error: 'Error al obtener tasa de supervivencia (periodo)' });
  }
};

const buildTasaSupervivenciaPorGrupo = async ({ periodo, programa, facultad, nivel, conCancelados, groupField, groupAlias }) => {
  const periodoBase = periodo || await getMaxPeriodo();
  if (!periodoBase) {
    return [];
  }
  const matriculadosRows = await getMatriculadosByGroup({
    periodo: periodoBase,
    programa,
    facultad,
    nivel,
    conCancelados,
    groupField,
    groupAlias
  });
  const primiparosRows = await countPrimiparosAcumuladosByGroup({
    periodo: periodoBase,
    programa,
    facultad,
    nivel,
    conCancelados,
    groupField,
    groupAlias,
    hastaPeriodo: true
  });
  const keys = new Set([
    ...matriculadosRows.map((row) => row[groupAlias]),
    ...primiparosRows.map((row) => row[groupAlias])
  ]);
  const results = [];
  for (const key of keys) {
    const matriculados = await getMatriculadosCount({
      periodo: periodoBase,
      programa: groupAlias === 'programa' ? key : programa,
      facultad: groupAlias === 'facultad' ? key : facultad,
      nivel: groupAlias === 'nivel' ? key : nivel,
      conCancelados
    });
    const primiparos = await countPrimiparosAcumulados({
      periodo: periodoBase,
      programa: groupAlias === 'programa' ? key : programa,
      facultad: groupAlias === 'facultad' ? key : facultad,
      nivel: groupAlias === 'nivel' ? key : nivel,
      conCancelados,
      hastaPeriodo: true
    });
    const tasa = primiparos > 0 ? Number(((matriculados / primiparos) * 100).toFixed(2)) : 0;
    results.push({
      [groupAlias]: key,
      matriculados,
      primiparos,
      tasa
    });
  }
  return results;
};

exports.obtenerTasaSupervivenciaPorFacultad = async (req, res) => {
  const { periodo, programa, nivel, conCancelados } = req.query;
  try {
    const results = await buildTasaSupervivenciaPorGrupo({
      periodo,
      programa,
      nivel,
      conCancelados,
      groupField: 'facultad',
      groupAlias: 'facultad'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de supervivencia (facultad):', error);
    res.status(500).json({ error: 'Error al obtener tasa de supervivencia (facultad)' });
  }
};

exports.obtenerTasaSupervivenciaPorPrograma = async (req, res) => {
  const { periodo, facultad, nivel, conCancelados } = req.query;
  try {
    const results = await buildTasaSupervivenciaPorGrupo({
      periodo,
      facultad,
      nivel,
      conCancelados,
      groupField: 'programa',
      groupAlias: 'programa'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de supervivencia (programa):', error);
    res.status(500).json({ error: 'Error al obtener tasa de supervivencia (programa)' });
  }
};

exports.obtenerTasaSupervivenciaPorNivel = async (req, res) => {
  const { periodo, facultad, programa, conCancelados } = req.query;
  try {
    const results = await buildTasaSupervivenciaPorGrupo({
      periodo,
      facultad,
      programa,
      conCancelados,
      groupField: 'nivel',
      groupAlias: 'nivel'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de supervivencia (nivel):', error);
    res.status(500).json({ error: 'Error al obtener tasa de supervivencia (nivel)' });
  }
};

exports.obtenerTasaDesercion28PorPeriodo = async (req, res) => {
  const { programa, facultad, nivel, conCancelados } = req.query;
  try {
    const baseSql = buildDesercionBaseSql({ programa, facultad, nivel, conCancelados, sinPeriodo: true });
    const [desertoresRows] = await pool.promise().query(
      `SELECT p2.periodoSiguiente as periodo, COUNT(*) as desertores ${baseSql} GROUP BY p2.periodoSiguiente ORDER BY p2.periodoSiguiente`
    );
    const results = [];
    for (const row of desertoresRows) {
      const matriculados = await getMatriculadosNoGraduadosT2Count({ periodo: row.periodo, programa, facultad, nivel, conCancelados });
      const tasa = matriculados > 0 ? Number(((row.desertores / matriculados) * 100).toFixed(2)) : 0;
      results.push({
        periodo: row.periodo,
        desertores: row.desertores,
        matriculados,
        tasa
      });
    }
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción periodo 2.8 (periodo):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción periodo 2.8 (periodo)' });
  }
};

const buildTasaDesercion28PorGrupo = async ({ periodo, programa, facultad, nivel, conCancelados, groupField, groupAlias }) => {
  const periodoBase = periodo || await getMaxPeriodo();
  if (!periodoBase) {
    return [];
  }
  const baseSql = buildDesercionBaseSql({ periodo: periodoBase, programa, facultad, nivel, conCancelados });
  const [desertoresRows] = await pool.promise().query(
    `SELECT ${groupField} as ${groupAlias}, COUNT(*) as desertores ${baseSql} GROUP BY ${groupField} ORDER BY desertores DESC, ${groupAlias}`
  );
  const matriculadosRows = await getMatriculadosNoGraduadosT2ByGroup({ periodo: periodoBase, programa, facultad, nivel, conCancelados, groupField, groupAlias });
  const matriculadosMap = new Map(matriculadosRows.map((row) => [row[groupAlias], row.cantidad]));
  const keys = new Set([
    ...desertoresRows.map((row) => row[groupAlias]),
    ...matriculadosRows.map((row) => row[groupAlias])
  ]);
  const results = [];
  for (const key of keys) {
    const desertores = await countDesertores({
      periodo: periodoBase,
      programa: groupAlias === 'programa' ? key : programa,
      facultad: groupAlias === 'facultad' ? key : facultad,
      nivel: groupAlias === 'nivel' ? key : nivel,
      conCancelados
    });
    const matriculados = await getMatriculadosNoGraduadosT2Count({
      periodo: periodoBase,
      programa: groupAlias === 'programa' ? key : programa,
      facultad: groupAlias === 'facultad' ? key : facultad,
      nivel: groupAlias === 'nivel' ? key : nivel,
      conCancelados
    });
    const tasa = matriculados > 0 ? Number(((desertores / matriculados) * 100).toFixed(2)) : 0;
    results.push({
      [groupAlias]: key,
      desertores,
      matriculados,
      tasa
    });
  }
  return results;
};

exports.obtenerTasaDesercion28PorFacultad = async (req, res) => {
  const { periodo, programa, nivel, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercion28PorGrupo({
      periodo,
      programa,
      nivel,
      conCancelados,
      groupField: 'm1.facultad',
      groupAlias: 'facultad'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción periodo 2.8 (facultad):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción periodo 2.8 (facultad)' });
  }
};

exports.obtenerTasaDesercion28PorPrograma = async (req, res) => {
  const { periodo, facultad, nivel, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercion28PorGrupo({
      periodo,
      facultad,
      nivel,
      conCancelados,
      groupField: 'm1.programa',
      groupAlias: 'programa'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción periodo 2.8 (programa):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción periodo 2.8 (programa)' });
  }
};

exports.obtenerTasaDesercion28PorNivel = async (req, res) => {
  const { periodo, facultad, programa, conCancelados } = req.query;
  try {
    const results = await buildTasaDesercion28PorGrupo({
      periodo,
      facultad,
      programa,
      conCancelados,
      groupField: 'm1.nivel',
      groupAlias: 'nivel'
    });
    res.json(results);
  } catch (error) {
    console.error('Error al obtener tasa de deserción periodo 2.8 (nivel):', error);
    res.status(500).json({ error: 'Error al obtener tasa de deserción periodo 2.8 (nivel)' });
  }
};

exports.predecirDesercion = (req, res) => {
  if (!req.body || (Array.isArray(req.body) && req.body.length === 0)) {
    return res.status(400).json({ error: 'Se requiere un payload con datos para predecir.' });
  }

  const pythonBin = process.env.PYTHON_BIN || 'python';
  const scriptPath = path.join(__dirname, '..', 'scripts', 'predecir_desercion.py');

  const payload = JSON.stringify(req.body);
  const proc = spawn(pythonBin, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  proc.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      const message = stderr.trim() || 'Error al ejecutar prediccion';
      return res.status(400).json({ error: message });
    }
    try {
      const result = JSON.parse(stdout);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Respuesta invalida del modelo' });
    }
  });

  proc.stdin.write(payload);
  proc.stdin.end();
};

exports.obtenerRiesgoDesercion = (req, res) => {
  const periodo = req.query.periodo || 'actual';
  const umbral = req.query.umbral || '0.7';
  const limite = req.query.limite || '200';
  const facultad = req.query.facultad || '';
  const programa = req.query.programa || '';

  const pythonBin = process.env.PYTHON_BIN || 'python';
  const scriptPath = path.join(__dirname, '..', 'scripts', 'listar_riesgo_desercion.py');

  const args = [
    '--periodo', periodo,
    '--umbral', umbral,
    '--limite', limite,
    '--facultad', facultad,
    '--programa', programa
  ];
  const proc = spawn(pythonBin, [scriptPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  proc.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      const message = stderr.trim() || 'Error al ejecutar consulta de riesgo';
      return res.status(400).json({ error: message });
    }
    try {
      const result = JSON.parse(stdout);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Respuesta invalida del modelo' });
    }
  });
};