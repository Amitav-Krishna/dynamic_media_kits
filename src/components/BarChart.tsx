import React from 'react';

// BarGraph component to display a chart image generated on the server.
// It expects a 'chartImage' prop which is a base64 encoded string of the image.
// The 'title' prop is still used for display above the image.
const BarGraph = ({ chartImage, title }) => {
  if (!chartImage) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-lg max-w-2xl mx-auto my-8 text-gray-600">
        <h2 className="text-xl font-semibold mb-4">{title || "Chart"}</h2>
        <p>No chart image available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-lg max-w-2xl mx-auto my-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="w-full">
        {/* Display the base64 encoded image */}
        <img
          src={`data:image/png;base64,${chartImage}`}
          alt={title || "Generated Chart"}
          className="w-full h-auto rounded-md"
        />
      </div>
    </div>
  );
};

export default BarGraph;
