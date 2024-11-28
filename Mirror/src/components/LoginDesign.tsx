function LoginDesign() {
  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center bg-black-primary">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 lg:px-16">
        {/* Logo and Title */}
        <div className="text-center space-y-6 sm:space-y-12">
          <div className="space-y-4 sm:space-y-6">
            <div className="w-20 h-20 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-8 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-3xl sm:text-5xl font-bold text-white">M</span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              Mirror AI
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl text-gray-400 leading-relaxed">
              Your AI consciousness
            </p>
          </div>
          
          {/* Feature List */}
          <div className="mt-8 sm:mt-16 space-y-4 sm:space-y-8">
            <p className="text-lg sm:text-xl lg:text-2xl bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
              Authenticate with real accounts
            </p>
            <p className="text-lg sm:text-xl lg:text-2xl bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
              Let your friends talk to you
            </p>
            <p className="text-lg sm:text-xl lg:text-2xl bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
              Have full control over your data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
  
  
  export default LoginDesign;