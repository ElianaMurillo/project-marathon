import { useState, useRef, useEffect } from "react";
import { Calendar, Check, Download, Upload, Info, X } from "lucide-react";
import weekSchedules from "./db/weekSchedules.json";

export default function MarathonTracker() {
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [currentPhase, setCurrentPhase] = useState(0);
  const [showImportInfo, setShowImportInfo] = useState(false);
  const [importMessage, setImportMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("marathonProgress");
    if (saved) {
      try {
        setCompletedWorkouts(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading progress");
      }
    }
  }, []);

  // Save to sessionStorage whenever completedWorkouts changes
  useEffect(() => {
    sessionStorage.setItem(
      "marathonProgress",
      JSON.stringify(completedWorkouts)
    );
  }, [completedWorkouts]);

  const phases = [
    {
      name: "FASE 1: Base Aeróbica",
      weeks: "Ene 13 - Mar 15",
      objetivo: "Construir base aeróbica y preparar 10K",
    },
    {
      name: "FASE 2: Construcción",
      weeks: "Mar 16 - Jun 14",
      objetivo: "Aumentar volumen, carreras largas 25-32K",
    },
    {
      name: "FASE 3: Pico y Taper",
      weeks: "Jun 15 - Nov 29",
      objetivo: "Mantener volumen y preparación final",
    },
  ];

  // Use `weekSchedules` imported from `./db/weekSchedules.json`
  // (previously a large local array; moved to a JSON file to keep this component lean)

  const toggleWorkout = (weekIndex, dayIndex) => {
    const key = `${weekIndex}-${dayIndex}`;
    setCompletedWorkouts((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getWeekProgress = (weekIndex) => {
    const week = weekSchedules[weekIndex];
    if (!week.workouts) return 0;
    const completed = week.workouts.filter(
      (_, i) => completedWorkouts[`${weekIndex}-${i}`]
    ).length;
    return Math.round((completed / week.workouts.length) * 100);
  };

  const exportData = () => {
    let csv = "Semana,Fecha,Día,Actividad,Detalle,Completado\n";
    weekSchedules.forEach((week, wi) => {
      if (week.workouts) {
        week.workouts.forEach((workout, di) => {
          const completed = completedWorkouts[`${wi}-${di}`] ? "Sí" : "No";
          csv += `${week.week},"${week.dates}","${workout.day}","${workout.activity}","${workout.detail}","${completed}"\n`;
        });
      }
    });

    // Add progress data
    csv += "\n\nProgreso por Semana\n";
    csv += "Semana,Fecha,Progreso\n";
    weekSchedules.forEach((week, wi) => {
      const progress = getWeekProgress(wi);
      csv += `${week.week},"${week.dates}","${progress}%"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maraton_bogota_2026_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setImportMessage({
      text: "✅ Datos exportados exitosamente",
      type: "success",
    });
    setTimeout(() => setImportMessage({ text: "", type: "" }), 3000);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n");
        const newCompleted = {};
        let imported = 0;

        // Parse CSV
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line.startsWith("Progreso por Semana")) break;

          const matches = line.match(/"([^"]*)"|([^,]+)/g);
          if (!matches || matches.length < 6) continue;

          const values = matches.map((v) => v.replace(/^"|"$/g, ""));
          const [weekNum, , day, , , completed] = values;

          if (completed === "Sí") {
            // Find week and day index
            const weekIndex = weekSchedules.findIndex((w) => w.week == weekNum);
            if (weekIndex !== -1 && weekSchedules[weekIndex].workouts) {
              const dayIndex = weekSchedules[weekIndex].workouts.findIndex(
                (wo) => wo.day === day
              );
              if (dayIndex !== -1) {
                newCompleted[`${weekIndex}-${dayIndex}`] = true;
                imported++;
              }
            }
          }
        }

        setCompletedWorkouts(newCompleted);
        setImportMessage({
          text: `✅ Importado exitosamente: ${imported} entrenamientos completados`,
          type: "success",
        });
        setTimeout(() => setImportMessage({ text: "", type: "" }), 5000);
      } catch (error) {
        setImportMessage({
          text: "❌ Error al importar. Verifica que sea un CSV válido",
          type: "error",
        });
        setTimeout(() => setImportMessage({ text: "", type: "" }), 5000);
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-indigo-600" />
                Maratón Bogotá 2026
              </h1>
              <p className="text-gray-600 mt-1">42K - 29 de Noviembre 2026</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Upload size={18} />
                Importar CSV
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                <Download size={18} />
                Exportar CSV
              </button>
              <button
                onClick={() => setShowImportInfo(!showImportInfo)}
                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                <Info size={18} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={importData}
              className="hidden"
            />
          </div>

          {/* Import/Export Info */}
          {showImportInfo && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    💾 Guardar y Recuperar tu Progreso
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • <strong>Exportar CSV:</strong> Descarga tu progreso
                      actual para respaldo
                    </li>
                    <li>
                      • <strong>Importar CSV:</strong> Recupera tu progreso
                      desde otro dispositivo
                    </li>
                    <li>
                      • <strong>Auto-guardado:</strong> Tu progreso se guarda
                      automáticamente en este navegador
                    </li>
                    <li>
                      • <strong>Cambiar de dispositivo:</strong> Exporta desde
                      un dispositivo e importa en otro
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowImportInfo(false)}
                  className="text-blue-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Import Message */}
          {importMessage.text && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                importMessage.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {importMessage.text}
            </div>
          )}

          {/* Phase Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {phases.map((phase, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPhase(idx)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                  currentPhase === idx
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <div className="font-semibold">{phase.name}</div>
                <div className="text-xs opacity-80">{phase.weeks}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-900">
              <strong>Objetivo:</strong> {phases[currentPhase].objetivo}
            </p>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-4">
          {weekSchedules
            .filter((week) => week.phase === currentPhase)
            .map((week, weekIndex) => {
              const actualWeekIndex = weekSchedules.indexOf(week);
              const progress = getWeekProgress(actualWeekIndex);

              return (
                <div
                  key={actualWeekIndex}
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold">
                          Semana {week.week}
                        </h3>
                        <p className="text-indigo-100 text-sm">{week.dates}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{progress}%</div>
                        <div className="text-xs text-indigo-100">
                          Completado
                        </div>
                      </div>
                    </div>
                    {progress > 0 && (
                      <div className="mt-2 bg-purple-300 bg-opacity-20 rounded-full h-2">
                        <div
                          className="bg-white h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {week.workouts ? (
                      <div className="space-y-2">
                        {week.workouts.map((workout, dayIndex) => {
                          const isCompleted =
                            completedWorkouts[`${actualWeekIndex}-${dayIndex}`];

                          return (
                            <div
                              key={dayIndex}
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition cursor-pointer ${
                                isCompleted
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-200 hover:border-indigo-300 bg-white"
                              }`}
                              onClick={() =>
                                toggleWorkout(actualWeekIndex, dayIndex)
                              }
                            >
                              <div className="flex-shrink-0 mt-1">
                                {isCompleted ? (
                                  <Check className="text-green-600" size={24} />
                                ) : (
                                  <div className="w-6 h-6 border-2 border-gray-300 rounded" />
                                )}
                              </div>
                              <div className="flex-grow">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold text-gray-800">
                                      {workout.day}
                                    </h4>
                                    <p className="text-indigo-600 font-medium text-sm">
                                      {workout.activity}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-gray-600 text-sm mt-1">
                                  {workout.detail}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-800 mb-2">
              🎯 Tiempo Objetivo
            </h4>
            <p className="text-2xl font-bold text-indigo-600">5:15 - 5:30</p>
            <p className="text-sm text-gray-600">Pace: 7:30-7:50 min/km</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-800 mb-2">📍 Elevación</h4>
            <p className="text-2xl font-bold text-indigo-600">81m</p>
            <p className="text-sm text-gray-600">
              Recorrido con desnivel moderado
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold text-gray-800 mb-2">
              📊 Progreso Total
            </h4>
            <p className="text-2xl font-bold text-indigo-600">
              {Object.keys(completedWorkouts).length}
            </p>
            <p className="text-sm text-gray-600">Entrenamientos completados</p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            💡 Recordatorios Clave
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-indigo-600 mb-2">
                Zonas de Frecuencia Cardíaca
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>
                  • <strong>Zona 2 (140-160 BPM):</strong> 80% de tus
                  entrenamientos
                </li>
                <li>
                  • <strong>Zona 3 (160-175 BPM):</strong> Tempo/resistencia
                </li>
                <li>
                  • <strong>Zona 4 (175-185 BPM):</strong> Intervalos
                </li>
                <li>
                  • <strong>Zona 5 (&gt;185 BPM):</strong> Solo sprints cortos
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-indigo-600 mb-2">
                Recuperación
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Dormir 7-8 horas mínimo</li>
                <li>• Hidratación: 2-3 litros/día</li>
                <li>• Proteína post-entreno: 20-30g</li>
                <li>• Rodillo de espuma 2-3x/semana</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
