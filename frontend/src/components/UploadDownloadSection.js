import React, { useState } from "react";

const UploadDownloadSection = () => {
  const [file, setFile] = useState(null);
  const token = localStorage.getItem("token");

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/upload/employees", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    alert(data.message || data.error);
  };

  const handleDownload = async () => {
    const res = await fetch("http://localhost:8000/download/employees", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "employees.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="bg-white/10 rounded-xl p-4 my-6 text-white">
      <h3 className="text-xl font-semibold mb-4">
        📂 Employee Excel Import/Export
      </h3>
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <input
          type="file"
          accept=".csv, .xlsx"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-white"
        />
        <button
          onClick={handleUpload}
          className="bg-pink-500 hover:bg-pink-400 text-white font-bold px-4 py-2 rounded"
        >
          Upload
        </button>
        <button
          onClick={handleDownload}
          className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 py-2 rounded"
        >
          Download
        </button>
      </div>
    </div>
  );
};

export default UploadDownloadSection;
