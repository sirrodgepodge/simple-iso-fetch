# iso-path
Node.js's native 'path' module's 'join' method made isomorphic(/universal)

useful for using 'require' on the front end or for dynamically generating routes.  Used the exact same way as Node.js's native <a href='https://nodejs.org/api/path.html#path_path_join_path1_path2'>path.join</a> with the bonus of being able to handle arrays

        import pathJoin from 'iso-path-join'
        
        var joinedPath = pathJoin('..', '..', './', 'testFolder', ['check', 'me', 'out'])
        
        console.log(joinedPath) // '../.././testFolder/check/me/out'
