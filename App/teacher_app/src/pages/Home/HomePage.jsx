import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import DashboardLayout from "@/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import api from "@/lib/axios";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { user, token, offset } = useContext(AuthContext);

  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [duration, setDuration] = useState(3);

  const [time, setTime] = useState(Date.now() + offset);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now() + offset);
    }, 1000);

    return () => clearInterval(interval);
  }, [offset]);

  // Fetch courses
  useEffect(() => {
    if (!token) return;

    api
      .get("/teacher/sessions/courses", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCourses(res.data.courses || []))
      .catch((err) => console.error(err));
  }, [token]);

  const toggleClass = (cls) => {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleStartSession = () => {
    if (!selectedCourse || selectedClasses.length === 0) return;

    const payload = {
      courseId: selectedCourse.id,
      classIds: selectedClasses.map((cls) => cls.id),
      duration,
    };

    api
      .post("/teacher/sessions/start", payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const session = res.data.session;
        navigate(`/session/${session.id}`, { state: { session } });
      })
      .catch((err) => console.error(err));
  };

  return (
    <DashboardLayout>
      <div
        className="min-h-screen bg-cover bg-center bg-fixed px-4 pb-12 pt-20"
        style={{
          backgroundImage: "url('/bg-teacher.jpg')",
        }}
      >
        {/* Profile Card */}
        <Card className="max-w-5xl mx-auto mb-12 shadow-xl border border-gray-200 bg-white/30 backdrop-blur-md rounded-3xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Teacher Profile
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pl-6">
              {/* Added pl-6 to shift entire section right */}

              {/* Avatar */}
              <div className="flex justify-center md:justify-start md:ml-6">
                {/* also nudged right slightly with md:ml-6 */}
                <Avatar className="h-28 w-28 shadow-lg">
                  <AvatarFallback className="text-3xl bg-blue-100 text-blue-700">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Info */}
              <div className="space-y-2 text-gray-800 md:ml-4">
                {/* added md:ml-4 for better spacing */}
                <p className="text-xl font-bold">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm opacity-80">{user?.email}</p>
                <p className="text-sm opacity-80">
                  Faculty ID: {user?.facultyId}
                </p>
                <p className="text-sm opacity-80">
                  Department: {user?.department}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course/Class Selection */}
        <Card className="max-w-5xl mx-auto shadow-xl border border-gray-200 bg-white/30 backdrop-blur-md rounded-3xl">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Start Attendance Session
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* Courses */}
            <p className="text-lg font-semibold mb-3 text-gray-800">
              Choose Course
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => {
                    setSelectedCourse(course);
                    setSelectedClasses([]);
                  }}
                  className={`
                    cursor-pointer p-5 rounded-2xl border shadow-sm 
                    transition-all duration-200
                    ${
                      selectedCourse?.id === course.id
                        ? "border-blue-600 bg-blue-100/70 scale-[1.03]"
                        : "border-gray-300 bg-white/60 hover:bg-white/80 hover:scale-[1.02]"
                    }
                  `}
                >
                  <p className="font-bold text-md text-gray-900">
                    {course.name}
                  </p>
                  <p className="text-xs text-gray-600">{course.code}</p>
                </div>
              ))}
            </div>

            {/* Classes */}
            {selectedCourse && (
              <>
                <p className="text-lg font-semibold mb-3 text-gray-800">
                  Choose Classes
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {selectedCourse.Classes.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => toggleClass(cls)}
                      className={`
                        cursor-pointer p-4 rounded-2xl border shadow-sm 
                        transition-all duration-200
                        ${
                          selectedClasses.includes(cls)
                            ? "border-green-600 bg-green-100/70 scale-[1.03]"
                            : "border-gray-300 bg-white/60 hover:bg-white/80 hover:scale-[1.02]"
                        }
                      `}
                    >
                      <p className="font-semibold text-gray-900">{cls.name}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Duration Selector */}
            {selectedClasses.length > 0 && (
              <div className="mb-8">
                <p className="text-lg font-semibold mb-3 text-gray-800">
                  Session Duration
                </p>

                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="border border-gray-400 p-3 rounded-xl w-44 bg-white/70 backdrop-blur-md"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} minutes
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Button */}
            {selectedCourse && selectedClasses.length > 0 && (
              <Button
                className="mt-4 px-8 py-3 text-lg rounded-xl"
                onClick={handleStartSession}
              >
                Start Session
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
